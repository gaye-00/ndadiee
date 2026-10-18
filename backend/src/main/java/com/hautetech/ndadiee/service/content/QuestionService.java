package com.hautetech.ndadiee.service.content;

import java.util.List;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.Pageables;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.response.ForumOverviewResponse;
import com.hautetech.ndadiee.dto.response.ForumOverviewResponse.TagCount;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.dto.response.QuestionSummaryResponse;
import com.hautetech.ndadiee.event.QuestionPostedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.exception.UnauthorizedException;
import com.hautetech.ndadiee.mapper.QuestionMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.BookmarkRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.QuestionFilter;
import com.hautetech.ndadiee.repository.specification.QuestionFilter.Following;
import com.hautetech.ndadiee.repository.specification.QuestionSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.BookmarkService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class QuestionService {

    // Adresses déjà prises, par l'API (/v1/questions/saved, /overview) et par l'application (/forum/new)
    private static final Set<String> RESERVED_SLUGS = Set.of("new", "saved", "overview");
    // Tags cités dans la vue d'ensemble du forum
    private static final int OVERVIEW_TAGS = 15;

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final BookmarkRepository bookmarkRepository;
    private final DeveloperRepository developerRepository;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final VoteService voteService;
    private final BookmarkService bookmarkService;
    private final QuestionMapper questionMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Les sujets des filtres, dans l'ordre demandé (départagé par l'identifiant : d'une page à l'autre, un sujet
     * n'est ni vu deux fois ni sauté). {@code following} : seulement le fil du membre, les auteurs et les tags qu'il
     * suit ; réservé à un membre connecté.
     */
    @Transactional(readOnly = true)
    public PageResponse<QuestionSummaryResponse> list(QuestionFilter filter, boolean following, Long currentUserId,
            Pageable pageable) {
        if (following) {
            if (currentUserId == null) {
                throw new UnauthorizedException();
            }
            filter = filter.within(new Following(
                    developerRepository.findFollowingIds(currentUserId),
                    developerRepository.findFollowedTagIds(currentUserId)));
        }
        Page<Question> page = questionRepository.findAll(
                QuestionSpecifications.filter(filter), Pageables.inTotalOrder(pageable));
        return PageResponse.from(page, toSummaries(page.getContent(), currentUserId));
    }

    /** La liste de lecture du membre : les sujets qu'il a enregistrés, les derniers enregistrés d'abord. */
    @Transactional(readOnly = true)
    public PageResponse<QuestionSummaryResponse> listSaved(Long userId, Pageable pageable) {
        Page<Question> page = bookmarkRepository.findSavedQuestions(
                userId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        List<QuestionSummaryResponse> content = page.getContent().stream()
                .map(question -> {
                    QuestionSummaryResponse summary = questionMapper.toSummary(question);
                    summary.setBookmarkedByMe(true);
                    return summary;
                })
                .toList();
        return PageResponse.from(page, content);
    }

    /** Le forum en chiffres, et ses tags les plus utilisés (navigation du forum) ; sans les contenus masqués. */
    @Transactional(readOnly = true)
    public ForumOverviewResponse overview() {
        List<TagCount> tags = questionRepository.countTopicsByTag(PageRequest.of(0, OVERVIEW_TAGS)).stream()
                .map(row -> new TagCount((String) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();
        return ForumOverviewResponse.builder()
                .topics(questionRepository.countByHiddenAtIsNull())
                .solved(questionRepository.countByAcceptedAnswerIsNotNullAndHiddenAtIsNull())
                .unanswered(questionRepository.countByAnswerCountAndHiddenAtIsNull(0))
                .answers(answerRepository.countVisible())
                .contributors(questionRepository.countContributors())
                .tags(tags)
                .build();
    }

    /** Consulter une question compte une vue. Masquée par l'administration, elle n'existe plus que pour son auteur et les admins. */
    public QuestionResponse getBySlug(String slug, Long currentUserId) {
        // Incrément avant la lecture : la réponse porte le compteur à jour (un sujet masqué ne compte pas de vues)
        questionRepository.incrementViewCount(slug);
        Question question = questionRepository.findBySlug(slug)
                .filter(found -> !found.isHidden() || userService.canSeeHidden(currentUserId, found.getAuthor().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Question", "slug", slug));
        return toResponse(question, currentUserId);
    }

    public QuestionResponse create(Long userId, QuestionRequest request) {
        Developer author = userService.getDeveloperOrThrow(userId);

        Question question = Question.builder()
                .title(request.getTitle().trim())
                .slug(slugService.generateUniqueSlug(request.getTitle(),
                        slug -> RESERVED_SLUGS.contains(slug) || questionRepository.existsBySlug(slug)))
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
        bookmarkRepository.deleteByQuestionId(questionId);
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
        response.setBookmarkedByMe(bookmarkService.isBookmarked(currentUserId, question.getId()));
        return response;
    }

    // Une page de sujets, avec ceux que le membre connecté a enregistrés (une requête pour toute la page)
    private List<QuestionSummaryResponse> toSummaries(List<Question> questions, Long currentUserId) {
        Set<Long> bookmarked = bookmarkService.bookmarkedIds(currentUserId, questions.stream().map(Question::getId).toList());
        return questions.stream()
                .map(question -> {
                    QuestionSummaryResponse summary = questionMapper.toSummary(question);
                    summary.setBookmarkedByMe(currentUserId == null ? null : bookmarked.contains(question.getId()));
                    return summary;
                })
                .toList();
    }
}
