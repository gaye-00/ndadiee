package com.hautetech.ndadiee.service.workspace;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.TeamEventRequest;
import com.hautetech.ndadiee.dto.request.TeamMessageRequest;
import com.hautetech.ndadiee.dto.response.TeamChatResponse;
import com.hautetech.ndadiee.dto.response.TeamEventResponse;
import com.hautetech.ndadiee.dto.response.TeamMessageResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.workspace.TeamEventAttendee;
import com.hautetech.ndadiee.model.workspace.TeamMessage;
import com.hautetech.ndadiee.model.workspace.TeamMessageKind;
import com.hautetech.ndadiee.repository.TeamEventAttendeeRepository;
import com.hautetech.ndadiee.repository.TeamMessageRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La discussion de l'équipe (« # équipe », design 3E), réservée à ses membres : ses messages, et ses rendez-vous
 * (« pair programming à 15 h »). Le prochain rendez-vous reste épinglé en haut ; chacun dit s'il y sera.
 *
 * Chaque membre écrit et propose un rendez-vous ; seuls l'auteur et ceux qui gèrent l'équipe suppriment un message.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TeamChatService {

    public static final int DEFAULT_PAGE_SIZE = 30;
    private static final int MAX_PAGE_SIZE = 50;
    // Un rendez-vous se propose pour tout à l'heure (un peu en retard compris), et pas pour dans plus d'un an
    private static final Duration EVENT_LATE_START = Duration.ofMinutes(30);
    private static final Duration EVENT_HORIZON = Duration.ofDays(365);

    private final TeamMessageRepository messageRepository;
    private final TeamEventAttendeeRepository attendeeRepository;
    private final WorkspaceAccess access;
    private final UserService userService;
    private final WorkspaceMapper mapper;
    private final UserMapper userMapper;

    /**
     * Une page de la discussion, dans l'ordre de lecture : les derniers messages, ou ceux d'avant {@code before} ; et le
     * rendez-vous épinglé.
     */
    @Transactional(readOnly = true)
    public TeamChatResponse messages(String slug, Long userId, Long before, int size) {
        Project project = access.member(slug, userId);
        int limit = Math.clamp(size, 1, MAX_PAGE_SIZE);
        // Un de plus : s'il est là, des messages plus anciens attendent
        PageRequest page = PageRequest.of(0, limit + 1);
        List<TeamMessage> found = before == null
                ? messageRepository.findLatest(project.getId(), page)
                : messageRepository.findBefore(project.getId(), before, page);

        List<TeamMessage> shown = new ArrayList<>(found.subList(0, Math.min(limit, found.size())));
        Collections.reverse(shown);
        TeamMessage next = nextEvent(project);
        Map<Long, List<TeamEventAttendee>> attendees = attendeesOf(Stream.concat(shown.stream(), Stream.ofNullable(next)).toList());

        return TeamChatResponse.builder()
                .messages(shown.stream().map(message -> toResponse(message, attendees, userId)).toList())
                .hasMore(found.size() > limit)
                .nextEvent(next == null ? null : toResponse(next, attendees, userId))
                .build();
    }

    public TeamMessageResponse post(String slug, Long userId, TeamMessageRequest request) {
        Project project = access.member(slug, userId);
        TeamMessage saved = messageRepository.save(TeamMessage.builder()
                .project(project)
                .author(userService.getDeveloperOrThrow(userId))
                .kind(TeamMessageKind.MESSAGE)
                .body(request.getBody().strip())
                .build());
        log.debug("[Workspace] Message {} - projet {} - par {}", saved.getId(), project.getId(), userId);
        return toResponse(saved, Map.of(), userId);
    }

    /** Propose un rendez-vous à l'équipe ; celui qui le propose y sera. */
    public TeamMessageResponse schedule(String slug, Long userId, TeamEventRequest request) {
        Project project = access.member(slug, userId);
        Instant now = Instant.now();
        if (request.getStartsAt().isBefore(now.minus(EVENT_LATE_START))) {
            throw new OperationNotAllowedException("Ce moment est déjà passé", "startsAt");
        }
        if (request.getStartsAt().isAfter(now.plus(EVENT_HORIZON))) {
            throw new OperationNotAllowedException("Un rendez-vous se propose moins d'un an à l'avance", "startsAt");
        }

        TeamMessage saved = messageRepository.save(TeamMessage.builder()
                .project(project)
                .author(userService.getDeveloperOrThrow(userId))
                .kind(TeamMessageKind.EVENT)
                .body(request.getTitle().strip())
                .eventStartsAt(request.getStartsAt())
                .eventEndsAt(request.getStartsAt().plus(Duration.ofMinutes(request.getDurationMinutes())))
                .eventLink(request.getLink() == null || request.getLink().isBlank() ? null : request.getLink().strip())
                .build());
        attendeeRepository.insertIfAbsent(saved.getId(), userId);
        log.info("[Workspace] Rendez-vous {} le {} - projet {} - par {}", saved.getId(), saved.getEventStartsAt(), project.getId(), userId);
        return toResponse(saved, attendeesOf(List.of(saved)), userId);
    }

    /** « J'y serai » (attending = true), ou plus (false), tant que le rendez-vous n'est pas fini. */
    public TeamMessageResponse attend(String slug, Long userId, Long messageId, boolean attending) {
        Project project = access.member(slug, userId);
        TeamMessage event = find(project, messageId);
        if (event.getKind() != TeamMessageKind.EVENT) {
            throw new OperationNotAllowedException("Ce message n'est pas un rendez-vous");
        }
        if (!event.getEventEndsAt().isAfter(Instant.now())) {
            throw new OperationNotAllowedException("Ce rendez-vous est terminé");
        }
        if (attending) {
            attendeeRepository.insertIfAbsent(messageId, userId);
        } else {
            attendeeRepository.deleteByMessageAndUser(messageId, userId);
        }
        // La discussion change pour les autres membres : leur pouls le voit (TeamMessageRepository.findRevision)
        event.setUpdatedAt(Instant.now());
        return toResponse(event, attendeesOf(List.of(event)), userId);
    }

    /** Supprime un message ou un rendez-vous : son auteur, ou qui gère l'équipe. */
    public void delete(String slug, Long userId, Long messageId) {
        Project project = access.member(slug, userId);
        TeamMessage message = find(project, messageId);
        if (!message.getAuthor().getId().equals(userId) && !access.isManager(project, userId)) {
            throw new ForbiddenException("Seuls son auteur et ceux qui gèrent l'équipe suppriment un message");
        }
        // Les réponses à un rendez-vous partent avec lui (clé étrangère ON DELETE CASCADE)
        messageRepository.delete(message);
        log.info("[Workspace] Message {} supprimé - projet {} - par {}", messageId, project.getId(), userId);
    }

    // ==================== HELPERS ====================

    private TeamMessage find(Project project, Long messageId) {
        return messageRepository.findByIdAndProjectId(messageId, project.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
    }

    private TeamMessage nextEvent(Project project) {
        return messageRepository
                .findFirstByProjectIdAndKindAndEventEndsAtAfterOrderByEventStartsAtAscIdAsc(project.getId(), TeamMessageKind.EVENT, Instant.now())
                .orElse(null);
    }

    // Les participants des rendez-vous de la liste, en une requête
    private Map<Long, List<TeamEventAttendee>> attendeesOf(List<TeamMessage> messages) {
        List<Long> events = messages.stream()
                .filter(message -> message.getKind() == TeamMessageKind.EVENT)
                .map(TeamMessage::getId)
                .distinct()
                .toList();
        if (events.isEmpty()) {
            return Map.of();
        }
        return attendeeRepository.findWithUserByMessageIds(events).stream()
                .collect(Collectors.groupingBy(attendee -> attendee.getMessage().getId()));
    }

    private TeamMessageResponse toResponse(TeamMessage message, Map<Long, List<TeamEventAttendee>> attendees, Long userId) {
        TeamMessageResponse response = mapper.toMessageResponse(message);
        if (message.getKind() == TeamMessageKind.EVENT) {
            List<UserSummaryResponse> people = attendees.getOrDefault(message.getId(), List.of()).stream()
                    .map(attendee -> userMapper.toSummary(attendee.getUser()))
                    .toList();
            response.setEvent(TeamEventResponse.builder()
                    .startsAt(message.getEventStartsAt())
                    .endsAt(message.getEventEndsAt())
                    .link(message.getEventLink())
                    .attendees(people)
                    .attending(people.stream().anyMatch(person -> Objects.equals(person.getId(), userId)))
                    .build());
        }
        return response;
    }
}
