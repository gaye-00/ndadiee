package com.hautetech.ndadiee.service.content;

import java.time.Instant;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.TextUtils;
import com.hautetech.ndadiee.dto.request.ArticleRequest;
import com.hautetech.ndadiee.dto.response.ArticleResponse;
import com.hautetech.ndadiee.dto.response.ArticleSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.event.ArticlePublishedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ArticleMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.Article;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.ArticleSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final VoteService voteService;
    private final ArticleMapper articleMapper;
    private final ApplicationEventPublisher eventPublisher;

    /** Articles publiés. Les brouillons n'apparaissent que dans {@link #listMine}. */
    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> list(String q, String tag, Language language, String author,
            Pageable pageable) {
        Page<Article> page = articleRepository.findAll(
                ArticleSpecifications.filter(q, tag, language, lowerCase(author), ArticleStatus.PUBLISHED), pageable);
        return PageResponse.from(page.map(articleMapper::toSummary));
    }

    /** Articles du membre connecté, brouillons compris. */
    @Transactional(readOnly = true)
    public PageResponse<ArticleSummaryResponse> listMine(Long userId, ArticleStatus status, Pageable pageable) {
        Developer author = userService.getDeveloperOrThrow(userId);
        Page<Article> page = articleRepository.findAll(
                ArticleSpecifications.filter(null, null, null, author.getUsername(), status), pageable);
        return PageResponse.from(page.map(articleMapper::toSummary));
    }

    /** Consulter un article publié compte une vue. Un brouillon n'existe que pour son auteur. */
    public ArticleResponse getBySlug(String slug, Long currentUserId) {
        // Incrément avant la lecture : la réponse porte le compteur à jour
        articleRepository.incrementViewCount(slug);
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Article", "slug", slug));

        if (article.getStatus() == ArticleStatus.DRAFT && !article.getAuthor().getId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Article", "slug", slug);
        }
        return toResponse(article, currentUserId);
    }

    public ArticleResponse create(Long userId, ArticleRequest request) {
        Developer author = userService.getDeveloperOrThrow(userId);

        Article article = Article.builder()
                .title(request.getTitle().trim())
                .slug(slugService.generateUniqueSlug(request.getTitle(), articleRepository::existsBySlug))
                .content(request.getContent())
                .coverImageUrl(request.getCoverImageUrl())
                .readingTimeMinutes(TextUtils.readingTimeMinutes(request.getContent()))
                .language(request.getLanguage() == null ? Language.FR : request.getLanguage())
                .author(author)
                .build();
        tagService.replaceTags(article.getTags(), request.getTags());
        if (Boolean.TRUE.equals(request.getPublish())) {
            markPublished(article);
        }

        Article saved = articleRepository.save(article);
        log.info("[Article] Créé - ID: {} - slug: {} - statut: {}", saved.getId(), saved.getSlug(), saved.getStatus());
        if (saved.getStatus() == ArticleStatus.PUBLISHED) {
            eventPublisher.publishEvent(new ArticlePublishedEvent(saved.getId(), userId));
        }
        return toResponse(saved, userId);
    }

    /**
     * Met à jour un article. {@code publish = true} publie un brouillon ; un article déjà
     * publié le reste (les votes et commentaires reçus ne doivent pas disparaître de la vue).
     */
    public ArticleResponse update(Long userId, Long articleId, ArticleRequest request) {
        Article article = findArticleOrThrow(articleId);
        requireAuthorOrModerator(article, userId, "Vous ne pouvez modifier que vos propres articles");

        // Le slug ne suit pas le titre : les liens déjà partagés restent valides
        article.setTitle(request.getTitle().trim());
        article.setContent(request.getContent());
        article.setCoverImageUrl(request.getCoverImageUrl());
        article.setReadingTimeMinutes(TextUtils.readingTimeMinutes(request.getContent()));
        article.setLanguage(request.getLanguage() == null ? Language.FR : request.getLanguage());
        tagService.replaceTags(article.getTags(), request.getTags());

        boolean publishing = Boolean.TRUE.equals(request.getPublish()) && article.getStatus() == ArticleStatus.DRAFT;
        if (publishing) {
            markPublished(article);
        }

        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        Article saved = articleRepository.saveAndFlush(article);
        log.info("[Article] ID: {} mis à jour par {}", articleId, userId);
        if (publishing) {
            eventPublisher.publishEvent(new ArticlePublishedEvent(articleId, article.getAuthor().getId()));
        }
        return toResponse(saved, userId);
    }

    public ArticleResponse publish(Long userId, Long articleId) {
        Article article = findArticleOrThrow(articleId);
        if (!article.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Vous ne pouvez publier que vos propres articles");
        }
        if (article.getStatus() == ArticleStatus.PUBLISHED) {
            return toResponse(article, userId);
        }

        markPublished(article);
        Article saved = articleRepository.saveAndFlush(article);
        log.info("[Article] ID: {} publié", articleId);
        eventPublisher.publishEvent(new ArticlePublishedEvent(articleId, userId));
        return toResponse(saved, userId);
    }

    public void delete(Long userId, Long articleId) {
        Article article = findArticleOrThrow(articleId);
        requireAuthorOrModerator(article, userId, "Vous ne pouvez supprimer que vos propres articles");

        // Votes et commentaires n'ont pas de clé étrangère vers leur cible : nettoyage manuel
        voteRepository.deleteByTargets(ContentType.ARTICLE, List.of(articleId));
        commentRepository.deleteByTargets(ContentType.ARTICLE, List.of(articleId));
        tagService.releaseTags(article.getTags());

        articleRepository.delete(article);
        log.info("[Article] ID: {} supprimé par {}", articleId, userId);
    }

    // ==================== HELPERS ====================

    private Article findArticleOrThrow(Long articleId) {
        return articleRepository.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article", articleId));
    }

    private void requireAuthorOrModerator(Article article, Long userId, String message) {
        if (!article.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }

    private void markPublished(Article article) {
        article.setStatus(ArticleStatus.PUBLISHED);
        article.setPublishedAt(Instant.now());
    }

    private ArticleResponse toResponse(Article article, Long currentUserId) {
        ArticleResponse response = articleMapper.toResponse(article);
        response.setCurrentUserVote(voteService.getUserVote(currentUserId, ContentType.ARTICLE, article.getId()));
        return response;
    }

    private String lowerCase(String value) {
        return value == null ? null : value.toLowerCase();
    }
}
