package com.hautetech.ndadiee.service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.FeedItemResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.mapper.FeedMapper;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.Article;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.specification.FeedSpecifications;

import lombok.RequiredArgsConstructor;

/**
 * Fil d'actualité : questions, articles publiés et projets mêlés, du plus récent au plus ancien.
 * Pour un membre connecté, il se limite aux auteurs et aux tags qu'il suit.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class FeedService {

    // Le fil fusionne trois listes en mémoire : au-delà de cette profondeur, on ne remonte plus
    private static final int MAX_DEPTH = 500;

    private static final Specification<Article> PUBLISHED =
            (root, query, cb) -> cb.equal(root.get("status"), ArticleStatus.PUBLISHED);

    // Ni les sujets ni les projets masqués par l'administration n'entrent dans le fil
    private static final Specification<Question> VISIBLE_QUESTION =
            (root, query, cb) -> cb.isNull(root.get("hiddenAt"));
    private static final Specification<Project> VISIBLE_PROJECT =
            (root, query, cb) -> cb.isNull(root.get("hiddenAt"));

    private final QuestionRepository questionRepository;
    private final ArticleRepository articleRepository;
    private final ProjectRepository projectRepository;
    private final DeveloperRepository developerRepository;
    private final FeedMapper feedMapper;

    /**
     * @param currentUserId membre connecté, ou null pour un visiteur (fil général)
     * @param language      langue de l'article ; pour une question ou un projet, qui n'ont pas de
     *                      langue propre, c'est la langue préférée de l'auteur qui est comparée
     */
    public PageResponse<FeedItemResponse> getFeed(Long currentUserId, String tag, String country,
            Language language, Pageable pageable) {
        List<Long> followingIds = List.of();
        List<Long> followedTagIds = List.of();
        if (currentUserId != null) {
            followingIds = developerRepository.findFollowingIds(currentUserId);
            followedTagIds = developerRepository.findFollowedTagIds(currentUserId);
        }
        boolean personalized = !followingIds.isEmpty() || !followedTagIds.isEmpty();

        PageResponse<FeedItemResponse> feed = load(tag, country, language, followingIds, followedTagIds, pageable);
        // Nouveau membre, ou abonnements sans contenu : plutôt qu'une page vide, le fil général
        if (personalized && feed.getTotalElements() == 0) {
            feed = load(tag, country, language, List.of(), List.of(), pageable);
        }
        return feed;
    }

    // ==================== HELPERS ====================

    private PageResponse<FeedItemResponse> load(String tag, String country, Language language,
            List<Long> followingIds, List<Long> followedTagIds, Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        // Pour servir la page N du fil fusionné, il faut les (N+1)*size premiers éléments de chaque source
        int depth = Math.min((page + 1) * size, MAX_DEPTH);

        Page<Question> questions = questionRepository.findAll(
                Specification.allOf(VISIBLE_QUESTION, FeedSpecifications.filter(Question.class, "author", false, tag,
                        country, language, followingIds, followedTagIds)),
                newest(depth, "createdAt"));
        Page<Article> articles = articleRepository.findAll(
                Specification.allOf(PUBLISHED, FeedSpecifications.filter(Article.class, "author", true, tag,
                        country, language, followingIds, followedTagIds)),
                newest(depth, "publishedAt"));
        Page<Project> projects = projectRepository.findAll(
                Specification.allOf(VISIBLE_PROJECT, FeedSpecifications.filter(Project.class, "owner", false, tag,
                        country, language, followingIds, followedTagIds)),
                newest(depth, "createdAt"));

        List<FeedItemResponse> content = Stream.of(
                        questions.getContent().stream().map(feedMapper::fromQuestion),
                        articles.getContent().stream().map(feedMapper::fromArticle),
                        projects.getContent().stream().map(feedMapper::fromProject))
                .flatMap(items -> items)
                .sorted(Comparator.comparing(FeedItemResponse::getCreatedAt).reversed())
                .skip((long) page * size)
                .limit(size)
                .toList();

        long total = questions.getTotalElements() + articles.getTotalElements() + projects.getTotalElements();
        int totalPages = (int) Math.ceil(total / (double) size);
        return PageResponse.<FeedItemResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .first(page == 0)
                .last(page + 1 >= totalPages)
                .build();
    }

    private Pageable newest(int limit, String dateProperty) {
        return PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, dateProperty));
    }
}
