package com.hautetech.ndadiee.service.project;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.event.ProjectCreatedEvent;
import com.hautetech.ndadiee.event.ProjectJoinRequestedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.ProjectSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectService {

    // Équipe montrée sur une carte de la vitrine : le porteur et les premiers arrivés
    private static final int TEAM_PREVIEW = 6;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectOpeningRepository projectOpeningRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final VoteService voteService;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;

    // ==================== PROJETS ====================

    @Transactional(readOnly = true)
    public PageResponse<ProjectResponse> list(String q, String tag, Boolean lookingForContributors, String owner,
            Long currentUserId, Pageable pageable) {
        Page<Project> page = projectRepository.findAll(ProjectSpecifications.filter(
                q, tag, lookingForContributors, owner == null ? null : owner.toLowerCase()), pageable);
        return PageResponse.from(page, toResponses(page.getContent(), currentUserId));
    }

    @Transactional(readOnly = true)
    public ProjectResponse getBySlug(String slug, Long currentUserId) {
        Project project = projectRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug));
        return toResponse(project, currentUserId);
    }

    public ProjectResponse create(Long userId, ProjectRequest request) {
        Developer owner = userService.getDeveloperOrThrow(userId);

        Project project = Project.builder()
                .name(request.getName().trim())
                .slug(slugService.generateUniqueSlug(request.getName(), projectRepository::existsBySlug))
                .lookingForContributors(Boolean.TRUE.equals(request.getLookingForContributors()))
                .owner(owner)
                .build();
        applyContent(project, request);
        tagService.replaceTags(project.getTags(), request.getTags());
        // Le propriétaire est le premier membre du projet
        project.getMembers().add(ProjectMember.builder()
                .project(project)
                .user(owner)
                .role(ProjectRole.OWNER)
                .status(MemberStatus.ACCEPTED)
                .build());

        Project saved = projectRepository.save(project);
        log.info("[Project] Créé - ID: {} - slug: {}", saved.getId(), saved.getSlug());
        eventPublisher.publishEvent(new ProjectCreatedEvent(saved.getId(), userId));
        return toResponse(saved, userId);
    }

    public ProjectResponse update(Long userId, Long projectId, ProjectRequest request) {
        Project project = findProjectOrThrow(projectId);
        requireOwnerOrModerator(project, userId, "Vous ne pouvez modifier que vos propres projets");

        // Le slug ne suit pas le nom : les liens déjà partagés restent valides
        project.setName(request.getName().trim());
        applyContent(project, request);
        project.setLookingForContributors(Boolean.TRUE.equals(request.getLookingForContributors()));
        tagService.replaceTags(project.getTags(), request.getTags());

        log.info("[Project] ID: {} mis à jour par {}", projectId, userId);
        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        return toResponse(projectRepository.saveAndFlush(project), userId);
    }

    public void delete(Long userId, Long projectId) {
        Project project = findProjectOrThrow(projectId);
        requireOwnerOrModerator(project, userId, "Vous ne pouvez supprimer que vos propres projets");

        // Votes et commentaires n'ont pas de clé étrangère vers leur cible : nettoyage manuel
        voteRepository.deleteByTargets(ContentType.PROJECT, List.of(projectId));
        commentRepository.deleteByTargets(ContentType.PROJECT, List.of(projectId));
        tagService.releaseTags(project.getTags());

        projectRepository.delete(project);
        log.info("[Project] ID: {} supprimé par {}", projectId, userId);
    }

    // ==================== MEMBRES ====================

    /** Demande à rejoindre un projet : crée une participation PENDING, à valider par le propriétaire. */
    public ProjectMemberResponse join(Long userId, Long projectId) {
        Developer developer = userService.getDeveloperOrThrow(userId);
        Project project = findProjectOrThrow(projectId);

        Optional<ProjectMember> existing = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
        if (existing.isPresent() && existing.get().getStatus() == MemberStatus.ACCEPTED) {
            throw new OperationNotAllowedException("Vous êtes déjà membre de ce projet");
        }
        if (existing.isPresent() && existing.get().getStatus() == MemberStatus.PENDING) {
            throw new OperationNotAllowedException("Votre demande est déjà en attente");
        }
        if (!project.isLookingForContributors()) {
            throw new OperationNotAllowedException("Ce projet ne recherche pas de contributeurs pour le moment");
        }

        // Une demande refusée peut être renouvelée : on réutilise la même ligne
        ProjectMember member = existing.orElseGet(() -> ProjectMember.builder()
                .project(project)
                .user(developer)
                .build());
        member.setRole(ProjectRole.CONTRIBUTOR);
        member.setStatus(MemberStatus.PENDING);

        ProjectMember saved = projectMemberRepository.save(member);
        log.info("[Project] Demande de contribution - projet {} - membre {}", projectId, userId);
        eventPublisher.publishEvent(new ProjectJoinRequestedEvent(projectId, project.getOwner().getId(), userId));
        return projectMapper.toMemberResponse(saved);
    }

    /** Quitte le projet, ou annule sa demande en attente. */
    public void leave(Long userId, Long projectId) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new OperationNotAllowedException("Vous ne participez pas à ce projet"));
        if (member.getRole() == ProjectRole.OWNER) {
            throw new OperationNotAllowedException("Le propriétaire ne peut pas quitter son projet");
        }
        projectMemberRepository.delete(member);
        log.info("[Project] Membre {} a quitté le projet {}", userId, projectId);
    }

    /** Membres acceptés ; le propriétaire et les mainteneurs voient aussi les demandes en attente ou refusées. */
    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembers(Long projectId, Long currentUserId) {
        Project project = findProjectOrThrow(projectId);
        List<ProjectMember> members = canManage(project, currentUserId)
                ? projectMemberRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                : projectMemberRepository.findByProjectIdAndStatusOrderByCreatedAtAsc(projectId, MemberStatus.ACCEPTED);
        return members.stream().map(projectMapper::toMemberResponse).toList();
    }

    /** Accepte ou refuse une demande de contribution, ou change le rôle d'un membre. */
    public ProjectMemberResponse decide(Long userId, Long projectId, Long memberId, MemberDecisionRequest request) {
        Project project = findProjectOrThrow(projectId);
        if (!canManage(project, userId)) {
            throw new ForbiddenException("Seuls le propriétaire et les mainteneurs peuvent traiter les demandes");
        }

        ProjectMember member = projectMemberRepository.findById(memberId)
                .filter(candidate -> candidate.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Membre du projet", memberId));
        if (member.getRole() == ProjectRole.OWNER || request.getRole() == ProjectRole.OWNER) {
            throw new OperationNotAllowedException("Le rôle de propriétaire ne peut être ni retiré ni attribué");
        }
        if (request.getStatus() == MemberStatus.PENDING) {
            throw new OperationNotAllowedException("La décision doit être ACCEPTED ou REJECTED");
        }

        member.setStatus(request.getStatus());
        if (request.getRole() != null) {
            member.setRole(request.getRole());
        }
        log.info("[Project] Membre {} du projet {} : {} par {}", memberId, projectId, request.getStatus(), userId);
        return projectMapper.toMemberResponse(projectMemberRepository.save(member));
    }

    // ==================== HELPERS ====================

    /**
     * Convertit une liste de projets en ajoutant ce qui ne vient pas de l'entité : nombre de membres,
     * et pour un membre connecté, son étoile et sa participation. Trois requêtes pour toute la liste.
     */
    public List<ProjectResponse> toResponses(List<Project> projects, Long currentUserId) {
        if (projects.isEmpty()) {
            return List.of();
        }
        List<Long> ids = projects.stream().map(Project::getId).toList();

        Map<Long, Long> memberCounts = projectMemberRepository.countByProjectIdsAndStatus(ids, MemberStatus.ACCEPTED)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Map<Long, Integer> stars = voteService.getUserVotes(currentUserId, ContentType.PROJECT, ids);
        Map<Long, MemberStatus> memberships = currentUserId == null
                ? Map.of()
                : projectMemberRepository.findByUserIdAndProjectIdIn(currentUserId, ids).stream()
                        .collect(Collectors.toMap(member -> member.getProject().getId(), ProjectMember::getStatus));
        Map<Long, List<ProjectOpeningResponse>> openings = projectOpeningRepository
                .findByProjectIdInAndOpenTrueOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(opening -> opening.getProject().getId(),
                        Collectors.mapping(projectMapper::toOpeningResponse, Collectors.toList())));
        Map<Long, List<UserSummaryResponse>> teams = projectMemberRepository
                .findWithUserByProjectIdsAndStatus(ids, MemberStatus.ACCEPTED).stream()
                .collect(Collectors.groupingBy(member -> member.getProject().getId(),
                        Collectors.mapping(member -> userMapper.toSummary(member.getUser()), Collectors.toList())));

        return projects.stream()
                .map(project -> {
                    ProjectResponse response = projectMapper.toResponse(project);
                    response.setMemberCount(memberCounts.getOrDefault(project.getId(), 0L));
                    response.setOpenings(openings.getOrDefault(project.getId(), List.of()));
                    response.setTeam(teams.getOrDefault(project.getId(), List.of()).stream().limit(TEAM_PREVIEW).toList());
                    if (currentUserId != null) {
                        response.setStarredByMe(stars.containsKey(project.getId()));
                        response.setMyMembershipStatus(memberships.get(project.getId()));
                    }
                    return response;
                })
                .toList();
    }

    private ProjectResponse toResponse(Project project, Long currentUserId) {
        return toResponses(List.of(project), currentUserId).get(0);
    }

    // Champs que le porteur renseigne, à la création comme à la modification
    private void applyContent(Project project, ProjectRequest request) {
        project.setTagline(trimToNull(request.getTagline()));
        project.setDescription(request.getDescription());
        project.setRepositoryUrl(request.getRepositoryUrl());
        project.setDemoUrl(request.getDemoUrl());
        project.setLogoUrl(request.getLogoUrl());
        project.setCoverUrl(request.getCoverUrl());
        project.setCoverThumbnailUrl(request.getCoverThumbnailUrl());
        project.setCoverCredit(trimToNull(request.getCoverCredit()));
        project.setCoverSourceUrl(request.getCoverSourceUrl());
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Project findProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet", projectId));
    }

    private void requireOwnerOrModerator(Project project, Long userId, String message) {
        if (!project.getOwner().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }

    // Le propriétaire et les mainteneurs acceptés gèrent les membres et les annonces du projet
    public boolean canManage(Project project, Long userId) {
        if (userId == null) {
            return false;
        }
        if (project.getOwner().getId().equals(userId)) {
            return true;
        }
        return projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .filter(member -> member.getRole() == ProjectRole.MAINTAINER)
                .isPresent();
    }
}
