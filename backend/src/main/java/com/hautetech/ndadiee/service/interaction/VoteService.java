package com.hautetech.ndadiee.service.interaction;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.dto.response.VoteResponse;
import com.hautetech.ndadiee.event.VoteCastEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.interaction.Vote;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final ContentTargetService contentTargetService;
    private final UserService userService;
    private final ReputationService reputationService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Pose un vote (+1 ou -1) ou inverse le vote existant. Revoter la même valeur ne change rien.
     * Un projet ne reçoit que des +1 : ce sont ses étoiles.
     */
    public VoteResponse vote(Long userId, VoteRequest request) {
        ContentType targetType = request.getTargetType();
        Long targetId = request.getTargetId();
        int value = request.getValue();

        if (value != 1 && value != -1) {
            throw new OperationNotAllowedException("La valeur du vote doit être +1 ou -1");
        }
        if (targetType == ContentType.PROJECT && value < 0) {
            throw new OperationNotAllowedException("Un projet ne peut recevoir que des étoiles (+1)");
        }

        Developer voter = userService.getDeveloperOrThrow(userId);
        ContentTarget target = contentTargetService.resolve(targetType, targetId);
        if (target.ownerId().equals(userId)) {
            throw new ForbiddenException("Vous ne pouvez pas voter pour votre propre contenu");
        }

        Optional<Vote> existing = voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId);
        int oldValue = existing.map(Vote::getValue).orElse(0);
        if (oldValue == value) {
            return toResponse(target, value, target.score());
        }

        Vote vote = existing.orElseGet(() -> Vote.builder()
                .user(voter)
                .targetType(targetType)
                .targetId(targetId)
                .build());
        vote.setValue(value);
        voteRepository.save(vote);

        applyChange(target, userId, oldValue, value);
        log.info("[Vote] Membre {} : {} sur {} {}", userId, value > 0 ? "+1" : "-1", targetType, targetId);
        return toResponse(target, value, target.score() + value - oldValue);
    }

    /** Retire le vote du membre sur ce contenu. Sans effet s'il n'avait pas voté. */
    public VoteResponse removeVote(Long userId, ContentType targetType, Long targetId) {
        ContentTarget target = contentTargetService.resolve(targetType, targetId);

        Optional<Vote> existing = voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId);
        if (existing.isEmpty()) {
            return toResponse(target, 0, target.score());
        }

        int oldValue = existing.get().getValue();
        voteRepository.delete(existing.get());

        applyChange(target, userId, oldValue, 0);
        log.info("[Vote] Membre {} : vote retiré sur {} {}", userId, targetType, targetId);
        return toResponse(target, 0, target.score() - oldValue);
    }

    /** Vote du membre sur un contenu : +1, -1, ou null (pas de vote, ou visiteur anonyme). */
    @Transactional(readOnly = true)
    public Integer getUserVote(Long userId, ContentType targetType, Long targetId) {
        if (userId == null) {
            return null;
        }
        return voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId)
                .map(Vote::getValue)
                .orElse(null);
    }

    /** Votes du membre sur une liste de contenus du même type, indexés par identifiant de contenu. */
    @Transactional(readOnly = true)
    public Map<Long, Integer> getUserVotes(Long userId, ContentType targetType, Collection<Long> targetIds) {
        if (userId == null || targetIds.isEmpty()) {
            return Map.of();
        }
        return voteRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, targetType, targetIds).stream()
                .collect(Collectors.toMap(Vote::getTargetId, Vote::getValue));
    }

    // ==================== HELPERS ====================

    // Répercute le changement de vote : score du contenu, réputation de son auteur, notification
    private void applyChange(ContentTarget target, Long voterId, int oldValue, int newValue) {
        contentTargetService.addScore(target.type(), target.id(), newValue - oldValue);
        reputationService.onVoteChanged(target.ownerId(), target.type(), oldValue, newValue);
        eventPublisher.publishEvent(
                new VoteCastEvent(target.type(), target.id(), target.ownerId(), voterId, oldValue, newValue));
    }

    private VoteResponse toResponse(ContentTarget target, int value, int score) {
        return VoteResponse.builder()
                .targetType(target.type())
                .targetId(target.id())
                .value(value)
                .score(score)
                .build();
    }
}
