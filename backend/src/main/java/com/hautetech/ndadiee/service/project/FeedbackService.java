package com.hautetech.ndadiee.service.project;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.FeedbackCallRequest;
import com.hautetech.ndadiee.dto.request.FeedbackRequest;
import com.hautetech.ndadiee.dto.response.FeedbackCallResponse;
import com.hautetech.ndadiee.dto.response.FeedbackResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.ConflictException;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.Feedback;
import com.hautetech.ndadiee.model.project.FeedbackCall;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.FeedbackCallRepository;
import com.hautetech.ndadiee.repository.FeedbackRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Demandes de retours (design 3D : « Votre avis sur l'écran trajets ») : l'équipe d'un projet invite la
 * communauté à essayer sa démo. Chaque membre y répond une fois ; seule l'équipe lit les retours.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackCallRepository callRepository;
    private final FeedbackRepository feedbackRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final ProjectMapper projectMapper;

    /** Demandes ouvertes d'un projet, les plus récentes d'abord, avec leurs retours comptés. */
    @Transactional(readOnly = true)
    public List<FeedbackCallResponse> listOpen(Long projectId, Long currentUserId) {
        projectService.findVisibleProjectOrThrow(projectId, currentUserId);
        return toResponses(callRepository.findByProjectIdAndOpenTrueOrderByCreatedAtDescIdDesc(projectId), currentUserId);
    }

    /** Publiée par le porteur ou un mainteneur. */
    public FeedbackCallResponse createCall(Long userId, Long projectId, FeedbackCallRequest request) {
        Project project = projectService.findProjectOrThrow(projectId);
        if (!projectService.canManage(project, userId)) {
            throw new ForbiddenException("Seuls le porteur du projet et ses mainteneurs demandent des retours");
        }

        FeedbackCall saved = callRepository.save(FeedbackCall.builder()
                .project(project)
                .author(userService.getDeveloperOrThrow(userId))
                .title(request.getTitle().trim())
                .prompt(request.getPrompt() == null || request.getPrompt().isBlank() ? null : request.getPrompt().trim())
                .build());
        log.info("[Feedback] Demande {} - projet {} - par {}", saved.getId(), projectId, userId);
        return toResponses(List.of(saved), userId).get(0);
    }

    /** Un avis sur une demande ouverte, un seul par membre. Renvoie la demande, avec ce retour compté. */
    public FeedbackCallResponse give(Long userId, Long projectId, Long callId, FeedbackRequest request) {
        FeedbackCall call = findCallOrThrow(projectId, callId);
        if (!call.isOpen()) {
            throw new OperationNotAllowedException("Cette demande de retours est close");
        }
        if (call.getAuthor().getId().equals(userId)) {
            throw new OperationNotAllowedException("Vous ne pouvez pas répondre à votre propre demande");
        }
        if (feedbackRepository.existsByCallIdAndAuthorId(callId, userId)) {
            throw new ConflictException("Vous avez déjà donné votre avis sur cette demande");
        }

        feedbackRepository.save(Feedback.builder()
                .call(call)
                .author(userService.getDeveloperOrThrow(userId))
                .rating(request.getRating())
                .body(request.getBody().strip())
                .build());
        log.info("[Feedback] Retour sur la demande {} - par {}", callId, userId);
        return toResponses(List.of(call), userId).get(0);
    }

    /** Les retours d'une demande, les plus récents d'abord : pour l'équipe du projet et les modérateurs. */
    @Transactional(readOnly = true)
    public PageResponse<FeedbackResponse> listFeedback(Long userId, Long projectId, Long callId, Pageable pageable) {
        FeedbackCall call = findCallOrThrow(projectId, callId);
        if (!projectService.isTeamMember(call.getProject(), userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Seule l'équipe du projet lit ses retours");
        }
        Page<Feedback> page = feedbackRepository.findByCallId(callId, pageable);
        return PageResponse.from(page, page.getContent().stream().map(projectMapper::toFeedbackResponse).toList());
    }

    // ==================== HELPERS ====================

    // Retours comptés et note moyenne en une requête pour toutes les demandes ; « déjà donné » en une autre
    private List<FeedbackCallResponse> toResponses(List<FeedbackCall> calls, Long currentUserId) {
        if (calls.isEmpty()) {
            return List.of();
        }
        List<Long> ids = calls.stream().map(FeedbackCall::getId).toList();
        Map<Long, Object[]> summaries = feedbackRepository.summarize(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> row));
        Set<Long> answered = currentUserId == null
                ? Set.of()
                : new HashSet<>(feedbackRepository.findCallIdsAnsweredBy(currentUserId, ids));

        return calls.stream()
                .map(call -> {
                    FeedbackCallResponse response = projectMapper.toFeedbackCallResponse(call);
                    Object[] summary = summaries.get(call.getId());
                    response.setFeedbackCount(summary == null ? 0 : (Long) summary[1]);
                    response.setAverageRating(summary == null || summary[2] == null
                            ? null
                            : Math.round(((Number) summary[2]).doubleValue() * 10) / 10.0);
                    if (currentUserId != null) {
                        response.setGivenByMe(answered.contains(call.getId()));
                    }
                    return response;
                })
                .toList();
    }

    private FeedbackCall findCallOrThrow(Long projectId, Long callId) {
        return callRepository.findById(callId)
                .filter(call -> call.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retours", callId));
    }
}
