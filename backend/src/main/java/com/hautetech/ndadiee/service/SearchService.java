package com.hautetech.ndadiee.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.SearchType;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.SearchResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.ArticleMapper;
import com.hautetech.ndadiee.mapper.QuestionMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.specification.ArticleSpecifications;
import com.hautetech.ndadiee.repository.specification.DeveloperSpecifications;
import com.hautetech.ndadiee.repository.specification.ProjectSpecifications;
import com.hautetech.ndadiee.repository.specification.QuestionSpecifications;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;

/** Recherche globale : questions, articles, projets et membres. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SearchService {

    private static final int MIN_QUERY_LENGTH = 2;

    private final QuestionRepository questionRepository;
    private final ArticleRepository articleRepository;
    private final ProjectRepository projectRepository;
    private final DeveloperRepository developerRepository;
    private final ProjectService projectService;
    private final QuestionMapper questionMapper;
    private final ArticleMapper articleMapper;
    private final UserMapper userMapper;

    /**
     * @param type catégorie à chercher ; ALL renvoie une page de chacune. Dans chaque catégorie,
     *             les résultats les mieux notés viennent en premier.
     */
    public SearchResponse search(String q, SearchType type, Long currentUserId, Pageable pageable) {
        String query = q == null ? "" : q.trim();
        if (query.length() < MIN_QUERY_LENGTH) {
            throw new OperationNotAllowedException(
                    "La recherche doit contenir au moins " + MIN_QUERY_LENGTH + " caractères");
        }

        SearchResponse.SearchResponseBuilder response = SearchResponse.builder().query(query);
        if (wants(type, SearchType.QUESTIONS)) {
            response.questions(PageResponse.from(questionRepository
                    .findAll(QuestionSpecifications.filter(query, null, null, null, null),
                            sortedBy(pageable, "score", "createdAt"))
                    .map(questionMapper::toSummary)));
        }
        if (wants(type, SearchType.ARTICLES)) {
            response.articles(PageResponse.from(articleRepository
                    .findAll(ArticleSpecifications.filter(query, null, null, null, ArticleStatus.PUBLISHED),
                            sortedBy(pageable, "score", "publishedAt"))
                    .map(articleMapper::toSummary)));
        }
        if (wants(type, SearchType.PROJECTS)) {
            Page<Project> projects = projectRepository.findAll(
                    ProjectSpecifications.filter(query, null, null, null),
                    sortedBy(pageable, "starsCount", "createdAt"));
            response.projects(PageResponse.from(projects, projectService.toResponses(projects.getContent(), currentUserId)));
        }
        if (wants(type, SearchType.USERS)) {
            response.users(PageResponse.from(developerRepository
                    .findAll(DeveloperSpecifications.filter(query, null, null, null, null),
                            sortedBy(pageable, "reputation", "createdAt"))
                    .map(userMapper::toSummary)));
        }
        return response.build();
    }

    // ==================== HELPERS ====================

    private boolean wants(SearchType requested, SearchType category) {
        return requested == null || requested == SearchType.ALL || requested == category;
    }

    private Pageable sortedBy(Pageable pageable, String... properties) {
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, properties));
    }
}
