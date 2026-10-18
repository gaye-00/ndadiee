package com.hautetech.ndadiee.service.admin;

import java.time.Instant;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.TextUtils;
import com.hautetech.ndadiee.dto.request.Visibility;
import com.hautetech.ndadiee.dto.response.AdminContentResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.Hideable;
import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.ModeratedContent;
import com.hautetech.ndadiee.model.content.Answer;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.specification.AdminSpecifications;
import com.hautetech.ndadiee.service.admin.AdminAuditService.Target;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;

/**
 * Les contenus, vus du back-office : sujets du forum, réponses et projets. Les chercher (masqués compris), les
 * masquer et les rétablir, les supprimer. Chaque décision va au journal (AdminAuditService).
 *
 * <ul>
 * <li>Masquer retire un contenu des pages publiques (listes, recherche, fil, compteurs) sans rien supprimer ; son
 * auteur le voit encore, avec le motif. Rétablir le remet tel quel.</li>
 * <li>Une réponse masquée sort du compteur de réponses de son sujet : un sujet dont la seule réponse est masquée
 * redevient « sans réponse ».</li>
 * <li>Supprimer passe par les services du contenu, comme la suppression d'un modérateur : votes, commentaires et
 * enregistrements partent avec lui.</li>
 * </ul>
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AdminContentService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ProjectRepository projectRepository;
    private final QuestionService questionService;
    private final AnswerService answerService;
    private final ProjectService projectService;
    private final AdminAuditService auditService;
    private final UserMapper userMapper;

    /** Les contenus de ce type, les plus récents d'abord. */
    @Transactional(readOnly = true)
    public PageResponse<AdminContentResponse> list(ModeratedContent type, String q, Visibility visibility,
            Pageable pageable) {
        Pageable newest = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return switch (type) {
            case QUESTION -> PageResponse.from(questionRepository
                    .findAll(AdminSpecifications.questions(q, visibility), newest).map(this::toResponse));
            case ANSWER -> PageResponse.from(answerRepository
                    .findAll(AdminSpecifications.answers(q, visibility), newest).map(this::toResponse));
            case PROJECT -> PageResponse.from(projectRepository
                    .findAll(AdminSpecifications.projects(q, visibility), newest).map(this::toResponse));
        };
    }

    public AdminContentResponse hide(Long adminId, ModeratedContent type, Long id, String reason) {
        Hideable content = find(type, id);
        if (content.isHidden()) {
            throw new OperationNotAllowedException("Ce contenu est déjà masqué");
        }

        content.setHiddenAt(Instant.now());
        content.setHiddenReason(reason.trim());
        if (content instanceof Answer answer) {
            questionRepository.addAnswerCount(answer.getQuestion().getId(), -1);
        }
        auditService.record(adminId, AdminActionType.HIDE_CONTENT, target(type, content), content.getHiddenReason(), null);
        return toResponse(content);
    }

    public AdminContentResponse unhide(Long adminId, ModeratedContent type, Long id) {
        Hideable content = find(type, id);
        if (!content.isHidden()) {
            throw new OperationNotAllowedException("Ce contenu n'est pas masqué");
        }

        content.setHiddenAt(null);
        content.setHiddenReason(null);
        if (content instanceof Answer answer) {
            questionRepository.addAnswerCount(answer.getQuestion().getId(), 1);
        }
        auditService.record(adminId, AdminActionType.UNHIDE_CONTENT, target(type, content), null, null);
        return toResponse(content);
    }

    /** Définitif. Le motif, s'il est donné, va au journal. */
    public void delete(Long adminId, ModeratedContent type, Long id, String reason) {
        // Le libellé d'abord : le contenu n'existera plus après
        Target target = target(type, find(type, id));
        switch (type) {
            case QUESTION -> questionService.delete(adminId, id);
            case ANSWER -> answerService.delete(adminId, id);
            case PROJECT -> projectService.delete(adminId, id);
        }
        auditService.record(adminId, AdminActionType.DELETE_CONTENT, target,
                reason == null || reason.isBlank() ? null : reason.trim(), null);
    }

    // ==================== HELPERS ====================

    private Hideable find(ModeratedContent type, Long id) {
        return switch (type) {
            case QUESTION -> questionRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Question", id));
            case ANSWER -> answerRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Réponse", id));
            case PROJECT -> projectRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Projet", id));
        };
    }

    // Le libellé gardé au journal : le titre du sujet (d'une réponse aussi), le nom du projet
    private Target target(ModeratedContent type, Hideable content) {
        return switch (content) {
            case Question question -> new Target(type.target(), question.getId(), question.getTitle());
            case Answer answer -> new Target(type.target(), answer.getId(), answer.getQuestion().getTitle());
            case Project project -> new Target(type.target(), project.getId(), project.getName());
            default -> throw new IllegalStateException("Contenu inattendu : " + content.getClass());
        };
    }

    private AdminContentResponse toResponse(Hideable content) {
        return switch (content) {
            case Question question -> toResponse(question);
            case Answer answer -> toResponse(answer);
            case Project project -> toResponse(project);
            default -> throw new IllegalStateException("Contenu inattendu : " + content.getClass());
        };
    }

    private AdminContentResponse toResponse(Question question) {
        return withModeration(question).type(ModeratedContent.QUESTION)
                .id(question.getId())
                .title(question.getTitle())
                .excerpt(TextUtils.excerpt(question.getBody()))
                .slug(question.getSlug())
                .author(userMapper.toSummary(question.getAuthor()))
                .score(question.getScore())
                .replies(question.getAnswerCount())
                .createdAt(question.getCreatedAt())
                .build();
    }

    private AdminContentResponse toResponse(Answer answer) {
        return withModeration(answer).type(ModeratedContent.ANSWER)
                .id(answer.getId())
                .title(answer.getQuestion().getTitle())
                .excerpt(TextUtils.excerpt(answer.getBody()))
                .slug(answer.getQuestion().getSlug())
                .author(userMapper.toSummary(answer.getAuthor()))
                .score(answer.getScore())
                .createdAt(answer.getCreatedAt())
                .build();
    }

    private AdminContentResponse toResponse(Project project) {
        return withModeration(project).type(ModeratedContent.PROJECT)
                .id(project.getId())
                .title(project.getName())
                .excerpt(project.getTagline() != null ? project.getTagline() : TextUtils.excerpt(project.getDescription()))
                .slug(project.getSlug())
                .author(userMapper.toSummary(project.getOwner()))
                .score(project.getStarsCount())
                .createdAt(project.getCreatedAt())
                .build();
    }

    private static AdminContentResponse.AdminContentResponseBuilder withModeration(Hideable content) {
        return AdminContentResponse.builder()
                .hidden(content.isHidden())
                .hiddenAt(content.getHiddenAt())
                .hiddenReason(content.getHiddenReason());
    }
}
