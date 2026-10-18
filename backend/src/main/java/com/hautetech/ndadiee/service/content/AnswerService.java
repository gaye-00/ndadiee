package com.hautetech.ndadiee.service.content;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.response.AnswerResponse;
import com.hautetech.ndadiee.dto.response.CommentResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.event.AnswerAcceptedEvent;
import com.hautetech.ndadiee.event.AnswerPostedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.AnswerMapper;
import com.hautetech.ndadiee.mapper.CommentMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Answer;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.model.interaction.Comment;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AnswerService {

    private final AnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final VoteService voteService;
    private final ReputationService reputationService;
    private final AnswerMapper answerMapper;
    private final CommentMapper commentMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Réponses d'une question : la réponse acceptée d'abord, puis les mieux notées. Chacune arrive avec son fil de
     * commentaires, chargé pour toute la page en une requête.
     */
    @Transactional(readOnly = true)
    public PageResponse<AnswerResponse> getByQuestion(Long questionId, Long currentUserId, Pageable pageable) {
        if (!questionRepository.existsById(questionId)) {
            throw new ResourceNotFoundException("Question", questionId);
        }
        Page<Answer> page = answerRepository.findByQuestionIdOrderByAcceptedDescScoreDescCreatedAtAsc(
                questionId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));

        List<Long> answerIds = page.getContent().stream().map(Answer::getId).toList();
        Map<Long, Integer> votes = voteService.getUserVotes(currentUserId, ContentType.ANSWER, answerIds);
        Map<Long, List<CommentResponse>> threads = answerIds.isEmpty() ? Map.of() : commentRepository
                .findByTargetTypeAndTargetIdInOrderByCreatedAtAsc(ContentType.ANSWER, answerIds).stream()
                .collect(Collectors.groupingBy(Comment::getTargetId,
                        Collectors.mapping(commentMapper::toResponse, Collectors.toList())));
        List<AnswerResponse> content = page.getContent().stream()
                .map(answer -> {
                    AnswerResponse response = answerMapper.toResponse(answer);
                    response.setCurrentUserVote(votes.get(answer.getId()));
                    response.setComments(threads.getOrDefault(answer.getId(), List.of()));
                    return response;
                })
                .toList();
        return PageResponse.from(page, content);
    }

    public AnswerResponse create(Long userId, Long questionId, AnswerRequest request) {
        Developer author = userService.getDeveloperOrThrow(userId);
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", questionId));
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new OperationNotAllowedException("Cette question est fermée : elle n'accepte plus de réponses");
        }

        Answer saved = answerRepository.save(Answer.builder()
                .body(request.getBody())
                .question(question)
                .author(author)
                .build());
        questionRepository.addAnswerCount(questionId, 1);

        log.info("[Answer] Créée - ID: {} - question {}", saved.getId(), questionId);
        eventPublisher.publishEvent(
                new AnswerPostedEvent(saved.getId(), questionId, question.getAuthor().getId(), userId));
        return answerMapper.toResponse(saved);
    }

    public AnswerResponse update(Long userId, Long answerId, AnswerRequest request) {
        Answer answer = findAnswerOrThrow(answerId);
        if (!answer.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Vous ne pouvez modifier que vos propres réponses");
        }
        answer.setBody(request.getBody());
        log.info("[Answer] ID: {} mise à jour par {}", answerId, userId);
        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        return answerMapper.toResponse(answerRepository.saveAndFlush(answer));
    }

    public void delete(Long userId, Long answerId) {
        Answer answer = findAnswerOrThrow(answerId);
        if (!answer.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres réponses");
        }

        Question question = answer.getQuestion();
        if (answer.isAccepted()) {
            revokeAcceptance(question, answer);
        }
        // Votes et commentaires n'ont pas de clé étrangère vers leur cible : nettoyage manuel
        voteRepository.deleteByTargets(ContentType.ANSWER, List.of(answerId));
        commentRepository.deleteByTargets(ContentType.ANSWER, List.of(answerId));

        answerRepository.delete(answer);
        questionRepository.addAnswerCount(question.getId(), -1);
        log.info("[Answer] ID: {} supprimée par {}", answerId, userId);
    }

    /**
     * Marque une réponse comme la solution. Seul l'auteur de la question le peut ; si une autre
     * réponse était déjà acceptée, elle perd ce statut (et son auteur les points associés).
     */
    public AnswerResponse accept(Long userId, Long answerId) {
        Answer answer = findAnswerOrThrow(answerId);
        Question question = answer.getQuestion();
        requireQuestionAuthor(question, userId);

        if (answer.isAccepted()) {
            return answerMapper.toResponse(answer);
        }

        Answer previous = question.getAcceptedAnswer();
        if (previous != null) {
            revokeAcceptance(question, previous);
        }

        answer.setAccepted(true);
        question.setAcceptedAnswer(answer);

        Long answerAuthorId = answer.getAuthor().getId();
        // Accepter sa propre réponse ne rapporte rien
        if (!answerAuthorId.equals(userId)) {
            reputationService.onAnswerAccepted(answerAuthorId);
        }

        log.info("[Answer] ID: {} acceptée - question {}", answerId, question.getId());
        eventPublisher.publishEvent(new AnswerAcceptedEvent(answerId, question.getId(), answerAuthorId, userId));
        return answerMapper.toResponse(answer);
    }

    /** Retire le statut de solution à une réponse. Seul l'auteur de la question le peut. */
    public AnswerResponse unaccept(Long userId, Long answerId) {
        Answer answer = findAnswerOrThrow(answerId);
        Question question = answer.getQuestion();
        requireQuestionAuthor(question, userId);

        if (answer.isAccepted()) {
            revokeAcceptance(question, answer);
            log.info("[Answer] ID: {} n'est plus acceptée - question {}", answerId, question.getId());
        }
        return answerMapper.toResponse(answer);
    }

    // ==================== HELPERS ====================

    private Answer findAnswerOrThrow(Long answerId) {
        return answerRepository.findById(answerId)
                .orElseThrow(() -> new ResourceNotFoundException("Réponse", answerId));
    }

    private void requireQuestionAuthor(Question question, Long userId) {
        if (!question.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Seul l'auteur de la question peut accepter une réponse");
        }
    }

    private void revokeAcceptance(Question question, Answer answer) {
        answer.setAccepted(false);
        question.setAcceptedAnswer(null);

        Long answerAuthorId = answer.getAuthor().getId();
        // Symétrique de accept() : pas de points à reprendre si l'auteur avait accepté sa propre réponse
        if (!answerAuthorId.equals(question.getAuthor().getId())) {
            reputationService.onAnswerUnaccepted(answerAuthorId);
        }
    }
}
