package com.hautetech.ndadiee.service.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import com.hautetech.ndadiee.dto.request.TeamEventRequest;
import com.hautetech.ndadiee.dto.response.TeamChatResponse;
import com.hautetech.ndadiee.dto.response.TeamMessageResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.workspace.TeamMessage;
import com.hautetech.ndadiee.model.workspace.TeamMessageKind;
import com.hautetech.ndadiee.repository.TeamEventAttendeeRepository;
import com.hautetech.ndadiee.repository.TeamMessageRepository;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * La discussion se lit dans l'ordre, page après page ; un rendez-vous se propose pour bientôt, et son auteur y sera ; on
 * ne répond plus à un rendez-vous terminé ; seuls l'auteur et qui gère l'équipe suppriment un message.
 */
@ExtendWith(MockitoExtension.class)
class TeamChatServiceTest {

    private static final String SLUG = "lagos-transit";
    private static final Long PROJECT_ID = 10L;
    private static final Long TUNDE = 2L;
    private static final Long AMA = 3L;

    @Mock
    private TeamMessageRepository messageRepository;
    @Mock
    private TeamEventAttendeeRepository attendeeRepository;
    @Mock
    private WorkspaceAccess access;
    @Mock
    private UserService userService;
    @Mock
    private WorkspaceMapper mapper;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private TeamChatService chatService;

    private final Project project = Project.builder().id(PROJECT_ID).slug(SLUG).build();

    private static Developer developer(Long id) {
        Developer developer = Developer.builder().username("dev-" + id).build();
        developer.setId(id);
        return developer;
    }

    private static TeamMessage message(long id, Long author) {
        return TeamMessage.builder().id(id).author(developer(author)).kind(TeamMessageKind.MESSAGE).body("Message " + id).build();
    }

    private static TeamMessage event(long id, Instant endsAt) {
        return TeamMessage.builder().id(id).author(developer(TUNDE)).kind(TeamMessageKind.EVENT).body("Pair programming")
                .eventStartsAt(endsAt.minus(Duration.ofHours(1))).eventEndsAt(endsAt).build();
    }

    @Test
    void aPageReadsOldestFirstAndSaysWhetherMoreWait() {
        when(access.member(SLUG, TUNDE)).thenReturn(project);
        // Un de plus que la page : des messages plus anciens attendent
        when(messageRepository.findLatest(eq(PROJECT_ID), any(Pageable.class))).thenReturn(List.of(message(9, AMA), message(8, TUNDE), message(7, AMA)));
        when(messageRepository.findFirstByProjectIdAndKindAndEventEndsAtAfterOrderByEventStartsAtAscIdAsc(eq(PROJECT_ID),
                eq(TeamMessageKind.EVENT), any(Instant.class))).thenReturn(Optional.empty());
        when(mapper.toMessageResponse(any(TeamMessage.class))).thenAnswer(invocation -> {
            TeamMessage source = invocation.getArgument(0);
            return TeamMessageResponse.builder().id(source.getId()).build();
        });

        TeamChatResponse page = chatService.messages(SLUG, TUNDE, null, 2);

        assertThat(page.getMessages()).extracting(TeamMessageResponse::getId).containsExactly(8L, 9L);
        assertThat(page.isHasMore()).isTrue();
        assertThat(page.getNextEvent()).isNull();
    }

    @Test
    void aMeetingThatAlreadyHappenedCannotBeProposed() {
        when(access.member(SLUG, TUNDE)).thenReturn(project);

        assertThatThrownBy(() -> chatService.schedule(SLUG, TUNDE, TeamEventRequest.builder()
                .title("Stand-up")
                .startsAt(Instant.now().minus(Duration.ofHours(2)))
                .durationMinutes(30)
                .build()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(messageRepository, never()).save(any(TeamMessage.class));
    }

    @Test
    void whoeverProposesAMeetingAttendsIt() {
        when(access.member(SLUG, TUNDE)).thenReturn(project);
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(developer(TUNDE));
        when(messageRepository.save(any(TeamMessage.class))).thenAnswer(invocation -> {
            TeamMessage saved = invocation.getArgument(0);
            saved.setId(40L);
            return saved;
        });
        when(mapper.toMessageResponse(any(TeamMessage.class))).thenReturn(new TeamMessageResponse());
        Instant startsAt = Instant.now().plus(Duration.ofHours(3));

        chatService.schedule(SLUG, TUNDE, TeamEventRequest.builder()
                .title("  Pair programming : cache Redis ")
                .startsAt(startsAt)
                .durationMinutes(90)
                .link(" ")
                .build());

        verify(messageRepository).save(argThat(saved -> saved.getKind() == TeamMessageKind.EVENT
                && saved.getBody().equals("Pair programming : cache Redis")
                && saved.getEventEndsAt().equals(startsAt.plus(Duration.ofMinutes(90)))
                && saved.getEventLink() == null));
        verify(attendeeRepository).insertIfAbsent(40L, TUNDE);
    }

    @Test
    void nobodyAnswersAMeetingThatIsOver() {
        when(access.member(SLUG, AMA)).thenReturn(project);
        when(messageRepository.findByIdAndProjectId(40L, PROJECT_ID)).thenReturn(Optional.of(event(40, Instant.now().minusSeconds(60))));

        assertThatThrownBy(() -> chatService.attend(SLUG, AMA, 40L, true)).isInstanceOf(OperationNotAllowedException.class);
        verify(attendeeRepository, never()).insertIfAbsent(anyLong(), anyLong());
    }

    @Test
    void aMessageIsNotAMeeting() {
        when(access.member(SLUG, AMA)).thenReturn(project);
        when(messageRepository.findByIdAndProjectId(41L, PROJECT_ID)).thenReturn(Optional.of(message(41, TUNDE)));

        assertThatThrownBy(() -> chatService.attend(SLUG, AMA, 41L, true)).isInstanceOf(OperationNotAllowedException.class);
    }

    @Test
    void onlyItsAuthorOrAManagerDeletesAMessage() {
        when(access.member(SLUG, AMA)).thenReturn(project);
        when(messageRepository.findByIdAndProjectId(41L, PROJECT_ID)).thenReturn(Optional.of(message(41, TUNDE)));
        when(access.isManager(project, AMA)).thenReturn(false);

        assertThatThrownBy(() -> chatService.delete(SLUG, AMA, 41L)).isInstanceOf(ForbiddenException.class);
        verify(messageRepository, never()).delete(any(TeamMessage.class));
    }
}
