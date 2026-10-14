package com.hautetech.ndadiee.service.interaction;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.CommentUpdateRequest;
import com.hautetech.ndadiee.dto.response.CommentResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.event.CommentPostedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.CommentMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.interaction.Comment;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final ContentTargetService contentTargetService;
    private final UserService userService;
    private final CommentMapper commentMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getByTarget(ContentType targetType, Long targetId, Pageable pageable) {
        contentTargetService.resolve(targetType, targetId);
        // Fil de discussion : toujours du plus ancien au plus récent
        Pageable chronological = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return PageResponse.from(commentRepository
                .findByTargetTypeAndTargetIdOrderByCreatedAtAsc(targetType, targetId, chronological)
                .map(commentMapper::toResponse));
    }

    public CommentResponse create(Long userId, CommentRequest request) {
        Developer author = userService.getDeveloperOrThrow(userId);
        ContentTarget target = contentTargetService.resolve(request.getTargetType(), request.getTargetId());

        Comment saved = commentRepository.save(Comment.builder()
                .body(request.getBody().trim())
                .author(author)
                .targetType(target.type())
                .targetId(target.id())
                .build());

        log.info("[Comment] Créé - ID: {} - sur {} {}", saved.getId(), target.type(), target.id());
        eventPublisher.publishEvent(
                new CommentPostedEvent(saved.getId(), target.type(), target.id(), target.ownerId(), userId));
        return commentMapper.toResponse(saved);
    }

    public CommentResponse update(Long userId, Long commentId, CommentUpdateRequest request) {
        Comment comment = findCommentOrThrow(commentId);
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Vous ne pouvez modifier que vos propres commentaires");
        }
        comment.setBody(request.getBody().trim());
        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        return commentMapper.toResponse(commentRepository.saveAndFlush(comment));
    }

    public void delete(Long userId, Long commentId) {
        Comment comment = findCommentOrThrow(commentId);
        if (!comment.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres commentaires");
        }
        commentRepository.delete(comment);
        log.info("[Comment] ID: {} supprimé par {}", commentId, userId);
    }

    // ==================== HELPERS ====================

    private Comment findCommentOrThrow(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire", commentId));
    }
}
