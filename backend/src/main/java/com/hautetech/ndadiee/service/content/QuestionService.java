package com.hautetech.ndadiee.service.content;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.dto.response.QuestionSummaryResponse;
import com.hautetech.ndadiee.event.QuestionPostedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.QuestionMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.QuestionSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final VoteService voteService;
    private final QuestionMapper questionMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public PageResponse<QuestionSummaryResponse> list(String q, String tag, QuestionStatus status,
            String author, Boolean unanswered, Pageable pageable) {
        Page<Question> page = questionRepository.findAll(
                QuestionSpecifications.filter(q, tag, status, lowerCase(author), unanswered), pageable);
        return PageResponse.from(page.map(questionMapper::toSummary));
    }

    /** Consulter une question compte une vue. */
    public QuestionResponse getBySlug(String slug, Long currentUserId) {
        // Incrément avant la lecture : la réponse porte le compteur à jour
        questionRepository.incrementViewCount(slug);
        Question question = questionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "slug", slug));
        return toResponse(question, currentUserId);
    }

    public QuestionResponse create(Long userId, QuestionRequest request) {
        Developer author = userService.getDeveloperOrThrow(userId);

        Question question = Question.builder()
                .title(request.getTitle().trim())
                .slug(slugService.generateUniqueSlug(request.getTitle(), questionRepository::existsBySlug))
                .body(request.getBody())
                .author(author)
                .build();
        tagService.replaceTags(question.getTags(), request.getTags());

        Question saved = questionRepository.save(question);
        log.info("[Question] Créée - ID: {} - slug: {}", saved.getId(), saved.getSlug());
        eventPublisher.publishEvent(new QuestionPostedEvent(saved.getId(), userId));
        return toResponse(saved, userId);
    }

    public QuestionResponse update(Long userId, Long questionId, QuestionRequest request) {
        Question question = findQuestionOrThrow(questionId);
        requireAuthorOrModerator(question, userId, "Vous ne pouvez modifier que vos propres questions");

        // Le slug ne suit pas le titre : les liens déjà partagés restent valides
        question.setTitle(request.getTitle().trim());
        question.setBody(request.getBody());
        tagService.replaceTags(question.getTags(), request.getTags());

        log.info("[Question] ID: {} mise à jour par {}", questionId, userId);
        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        return toResponse(questionRepository.saveAndFlush(question), userId);
    }

    /** Ferme ou rouvre une question. Une question fermée n'accepte plus de réponses. */
    public QuestionResponse changeStatus(Long userId, Long questionId, QuestionStatus status) {
        Question question = findQuestionOrThrow(questionId);
        requireAuthorOrModerator(question, userId, "Vous ne pouvez fermer que vos propres questions");

        question.setStatus(status);
        log.info("[Question] ID: {} passée à {} par {}", questionId, status, userId);
        return toResponse(questionRepository.saveAndFlush(question), userId);
    }

    public void delete(Long userId, Long questionId) {
        Question question = findQuestionOrThrow(questionId);
        boolean moderator = userService.canModerate(userId);

        if (!question.getAuthor().getId().equals(userId) && !moderator) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres questions");
        }
        // Une fois des réponses reçues, la question ne concerne plus seulement son auteur
        if (!moderator && question.getAnswerCount() > 0) {
            throw new OperationNotAllowedException(
                    "Cette question a déjà reçu des réponses : seul un modérateur peut la supprimer");
        }

        // Votes et commentaires n'ont pas de clé étrangère vers leur cible : nettoyage manuel.
        // Les réponses, elles, sont supprimées en cascade par la base.
        List<Long> answerIds = answerRepository.findIdsByQuestionId(questionId);
        if (!answerIds.isEmpty()) {
            voteRepository.deleteByTargets(ContentType.ANSWER, answerIds);
            commentRepository.deleteByTargets(ContentType.ANSWER, answerIds);
        }
        voteRepository.deleteByTargets(ContentType.QUESTION, List.of(questionId));
        commentRepository.deleteByTargets(ContentType.QUESTION, List.of(questionId));
        tagService.releaseTags(question.getTags());

        questionRepository.delete(question);
        log.info("[Question] ID: {} supprimée par {}", questionId, userId);
    }

    // ==================== HELPERS ====================

    public Question findQuestionOrThrow(Long questionId) {
        return questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", questionId));
    }

    private void requireAuthorOrModerator(Question question, Long userId, String message) {
        if (!question.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }

    private QuestionResponse toResponse(Question question, Long currentUserId) {
        QuestionResponse response = questionMapper.toResponse(question);
        response.setCurrentUserVote(voteService.getUserVote(currentUserId, ContentType.QUESTION, question.getId()));
        return response;
    }

    private String lowerCase(String value) {
        return value == null ? null : value.toLowerCase();
    }
}
