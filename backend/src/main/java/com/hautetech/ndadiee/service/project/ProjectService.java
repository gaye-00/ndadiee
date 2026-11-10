package com.hautetech.ndadiee.service.project;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.Pageables;
import com.hautetech.ndadiee.dto.request.JoinProjectRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.MemberSpecialtyRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectSettingsRequest;
import com.hautetech.ndadiee.dto.response.HackathonBriefResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectFacetsResponse;
import com.hautetech.ndadiee.dto.response.ProjectFacetsResponse.CountryFacet;
import com.hautetech.ndadiee.dto.response.ProjectFacetsResponse.RoleFacet;
import com.hautetech.ndadiee.dto.response.ProjectFacetsResponse.StackFacet;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.event.ProjectCreatedEvent;
import com.hautetech.ndadiee.event.ProjectJoinRequestedEvent;
import com.hautetech.ndadiee.event.ProjectMemberLeftEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.HackathonMapper;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.HackathonTeamRepository;
import com.hautetech.ndadiee.repository.ProjectGithubActivityRepository;
import com.hautetech.ndadiee.repository.ProjectMediaRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.ProjectFilter;
import com.hautetech.ndadiee.repository.specification.ProjectSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.media.MediaUploadService;
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
    // Adresses déjà prises, par l'API (/v1/projects/facets) et par l'application (/projects/new)
    private static final Set<String> RESERVED_SLUGS = Set.of("facets", "new");

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectOpeningRepository projectOpeningRepository;
    private final ProjectMediaRepository mediaRepository;
    private final ProjectGithubActivityRepository githubActivityRepository;
    private final DeveloperRepository developerRepository;
    // Inscriptions aux hackathons, lues ici sans passer par HackathonService, qui dépend de ce service
    private final HackathonTeamRepository hackathonTeamRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final VoteService voteService;
    // Les images envoyées pour un projet lui sont rattachées : celles que plus rien ne montre sont supprimées
    private final MediaUploadService mediaUploadService;
    private final OpeningMatcher openingMatcher;
    private final ProjectMapper projectMapper;
    private final HackathonMapper hackathonMapper;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;

    // ==================== PROJETS ====================

    @Transactional(readOnly = true)
    public PageResponse<ProjectResponse> list(ProjectFilter filter, Long currentUserId, Pageable pageable) {
        // La vitrine se lit page après page : un projet n'y est ni vu deux fois ni sauté
        Page<Project> page = projectRepository.findAll(ProjectSpecifications.filter(filter), Pageables.inTotalOrder(pageable));
        return PageResponse.from(page, toResponses(page.getContent(), currentUserId));
    }

    /**
     * Facettes de la vitrine : pour chaque rôle recherché, technologie et pays, le nombre de projets que
     * donnerait ce choix avec les autres filtres de la recherche ; et pour « Tous » et « Qui recrutent ».
     */
    @Transactional(readOnly = true)
    public ProjectFacetsResponse facets(ProjectFilter filter) {
        Specification<Project> matching = ProjectSpecifications.filter(filter);
        ProjectFilter anyRole = filter.withoutRecruitment();
        Specification<Project> anyRoleMatching = ProjectSpecifications.filter(anyRole);

        List<RoleFacet> roles = projectRepository.countByOpenRole(anyRoleMatching).stream()
                .map(row -> new RoleFacet((TeamRole) row[0], ((Number) row[1]).longValue(), ((Number) row[2]).longValue()))
                .sorted(Comparator.comparing(RoleFacet::role))
                .toList();
        List<StackFacet> stacks = projectRepository.countByTag(ProjectSpecifications.filter(filter.withoutTag())).stream()
                .map(row -> new StackFacet((String) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();
        List<CountryFacet> countries = projectRepository.countByOwnerCountry(ProjectSpecifications.filter(filter.withoutCountry()))
                .stream()
                .map(row -> new CountryFacet((String) row[0], ((Number) row[1]).longValue()))
                .sorted(Comparator.comparingLong(CountryFacet::projects).reversed().thenComparing(CountryFacet::country))
                .toList();

        return ProjectFacetsResponse.builder()
                .total(projectRepository.count(matching))
                .seats(projectRepository.sumOpenSeats(matching))
                .all(projectRepository.count(anyRoleMatching))
                .recruiting(projectRepository.count(ProjectSpecifications.filter(anyRole.recruiting())))
                .roles(roles)
                .stacks(stacks)
                .countries(countries)
                .build();
    }

    /** Page du projet (design 3D) : le projet, sa galerie, son activité GitHub, et le détail de ses rôles ouverts. */
    @Transactional(readOnly = true)
    public ProjectResponse getBySlug(String slug, Long currentUserId) {
        Project project = projectRepository.findBySlug(slug)
                .filter(found -> isVisibleTo(found, currentUserId))
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug));
        ProjectResponse response = toResponse(project, currentUserId);
        addPageDetails(project, response, currentUserId);
        return response;
    }

    public ProjectResponse create(Long userId, ProjectRequest request) {
        Developer owner = userService.getDeveloperOrThrow(userId);

        Project project = Project.builder()
                .name(request.getName().trim())
                .slug(slugService.generateUniqueSlug(request.getName(),
                        slug -> RESERVED_SLUGS.contains(slug) || projectRepository.existsBySlug(slug)))
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
        mediaUploadService.attach(saved.getId(), imagesOf(saved));
        log.info("[Project] Créé - ID: {} - slug: {}", saved.getId(), saved.getSlug());
        eventPublisher.publishEvent(new ProjectCreatedEvent(saved.getId(), userId));
        return toResponse(saved, userId);
    }

    public ProjectResponse update(Long userId, Long projectId, ProjectRequest request) {
        Project project = findProjectOrThrow(projectId);
        requireOwnerOrModerator(project, userId, "Vous ne pouvez modifier que vos propres projets");

        // Le slug ne suit pas le nom : les liens déjà partagés restent valides
        project.setName(request.getName().trim());
        Set<String> previousImages = imagesOf(project);
        applyContent(project, request);
        Set<String> images = imagesOf(project);
        previousImages.removeAll(images);
        mediaUploadService.release(projectId, previousImages);
        mediaUploadService.attach(projectId, images);
        project.setLookingForContributors(Boolean.TRUE.equals(request.getLookingForContributors()));
        tagService.replaceTags(project.getTags(), request.getTags());

        log.info("[Project] ID: {} mis à jour par {}", projectId, userId);
        // saveAndFlush : la réponse doit porter la nouvelle date de modification
        return toResponse(projectRepository.saveAndFlush(project), userId);
    }

    /**
     * Les réglages de l'espace d'équipe : le dépôt et le recrutement, sans toucher au reste du projet. Un nouveau dépôt
     * est relu à la synchronisation suivante (PullRequestSyncService).
     */
    public ProjectResponse updateSettings(Long userId, Long projectId, ProjectSettingsRequest request) {
        Project project = findProjectOrThrow(projectId);
        requireOwnerOrModerator(project, userId, "Seul le porteur du projet change ses réglages");

        project.setRepositoryUrl(trimToNull(request.getRepositoryUrl()));
        project.setLookingForContributors(request.getLookingForContributors());
        log.info("[Project] ID: {} réglages mis à jour par {} (dépôt : {}, recrute : {})", projectId, userId,
                project.getRepositoryUrl(), project.isLookingForContributors());
        return toResponse(projectRepository.saveAndFlush(project), userId);
    }

    public void delete(Long userId, Long projectId) {
        Project project = findProjectOrThrow(projectId);
        requireOwnerOrModerator(project, userId, "Vous ne pouvez supprimer que vos propres projets");
        remove(project);
        log.info("[Project] ID: {} supprimé par {}", projectId, userId);
    }

    /**
     * Le compte du porteur est supprimé. Le projet a une équipe : il passe au plus ancien mainteneur, sinon au plus
     * ancien membre, et ses tâches attendent un nouveau preneur. Il n'en a pas : il part avec le compte.
     *
     * @return le nouveau porteur, ou vide si le projet est supprimé
     */
    public Optional<Developer> handOverOrDelete(Project project) {
        Long ownerId = project.getOwner().getId();
        Optional<ProjectMember> successor = successorOf(project);
        if (successor.isEmpty()) {
            remove(project);
            log.info("[Project] ID: {} supprimé avec le compte de son porteur {}", project.getId(), ownerId);
            return Optional.empty();
        }
        ProjectMember heir = successor.get();
        heir.setRole(ProjectRole.OWNER);
        project.setOwner(heir.getUser());
        // Par la liste du projet (orphanRemoval) : une suppression directe serait rejouée par sa cascade
        project.getMembers().removeIf(member -> member.getUser().getId().equals(ownerId));
        projectRepository.save(project);
        eventPublisher.publishEvent(new ProjectMemberLeftEvent(project.getId(), ownerId));
        log.info("[Project] ID: {} transmis à {} (compte du porteur {} supprimé)", project.getId(), heir.getUser().getId(), ownerId);
        return Optional.of(heir.getUser());
    }

    /** Qui reprendrait ce projet si son porteur partait : le plus ancien mainteneur, sinon le plus ancien membre. */
    public Optional<ProjectMember> successorOf(Project project) {
        Long ownerId = project.getOwner().getId();
        List<ProjectMember> team = projectMemberRepository
                .findByProjectIdAndStatusOrderByCreatedAtAsc(project.getId(), MemberStatus.ACCEPTED).stream()
                .filter(member -> !member.getUser().getId().equals(ownerId) && !member.getUser().isDeleted())
                .toList();
        return team.stream().filter(member -> member.getRole() == ProjectRole.MAINTAINER).findFirst()
                .or(() -> team.stream().findFirst());
    }

    private void remove(Project project) {
        Long projectId = project.getId();
        // Votes et commentaires n'ont pas de clé étrangère vers leur cible : nettoyage manuel
        voteRepository.deleteByTargets(ContentType.PROJECT, List.of(projectId));
        commentRepository.deleteByTargets(ContentType.PROJECT, List.of(projectId));
        tagService.releaseTags(project.getTags());
        projectRepository.delete(project);
    }

    // ==================== MEMBRES ====================

    /** Demande à rejoindre un projet, sans viser de rôle en particulier. */
    public ProjectMemberResponse join(Long userId, Long projectId) {
        return join(userId, projectId, null);
    }

    /**
     * Candidature : crée une participation PENDING, à valider par le porteur ou un mainteneur. Elle peut
     * viser une annonce ouverte du projet (son rôle devient celui du membre) et porter un mot pour l'équipe.
     */
    public ProjectMemberResponse join(Long userId, Long projectId, JoinProjectRequest request) {
        Developer developer = userService.getDeveloperOrThrow(userId);
        Project project = findVisibleProjectOrThrow(projectId, userId);

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
        ProjectOpening opening = request == null || request.getOpeningId() == null
                ? null
                : findOpenOpening(project, request.getOpeningId());
        member.setRole(ProjectRole.CONTRIBUTOR);
        member.setStatus(MemberStatus.PENDING);
        member.setOpening(opening);
        member.setSpecialty(opening == null ? null : opening.getRole());
        member.setMotivation(request == null ? null : trimToNull(request.getMotivation()));

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
        boolean wasInTeam = member.getStatus() == MemberStatus.ACCEPTED;
        projectMemberRepository.delete(member);
        log.info("[Project] Membre {} a quitté le projet {}", userId, projectId);
        if (wasInTeam) {
            eventPublisher.publishEvent(new ProjectMemberLeftEvent(projectId, userId));
        }
    }

    /** Retire un membre de l'équipe : le porteur et les mainteneurs, jamais le porteur, jamais soi-même (quitter). */
    public void removeMember(Long userId, Long projectId, Long memberId) {
        Project project = findProjectOrThrow(projectId);
        if (!canManage(project, userId)) {
            throw new ForbiddenException("Seuls le propriétaire et les mainteneurs retirent un membre de l'équipe");
        }
        ProjectMember member = projectMemberRepository.findById(memberId)
                .filter(candidate -> candidate.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Membre du projet", memberId));
        if (member.getRole() == ProjectRole.OWNER) {
            throw new OperationNotAllowedException("Le propriétaire ne peut pas être retiré de son projet");
        }
        if (member.getUser().getId().equals(userId)) {
            throw new OperationNotAllowedException("Pour partir de l'équipe, quitte le projet");
        }

        Long removedId = member.getUser().getId();
        boolean wasInTeam = member.getStatus() == MemberStatus.ACCEPTED;
        projectMemberRepository.delete(member);
        log.info("[Project] Membre {} retiré du projet {} par {}", removedId, projectId, userId);
        if (wasInTeam) {
            eventPublisher.publishEvent(new ProjectMemberLeftEvent(projectId, removedId));
        }
    }

    /** Membres acceptés ; le propriétaire et les mainteneurs voient aussi les demandes en attente ou refusées. */
    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembers(Long projectId, Long currentUserId) {
        Project project = findVisibleProjectOrThrow(projectId, currentUserId);
        boolean manager = canManage(project, currentUserId);
        List<ProjectMember> members = manager
                ? projectMemberRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                : projectMemberRepository.findByProjectIdAndStatusOrderByCreatedAtAsc(projectId, MemberStatus.ACCEPTED);
        return members.stream()
                .map(member -> {
                    ProjectMemberResponse response = projectMapper.toMemberResponse(member);
                    // Le mot de la candidature est adressé à l'équipe qui recrute
                    if (!manager) {
                        response.setMotivation(null);
                    }
                    return response;
                })
                .toList();
    }

    /** Un membre de l'équipe choisit le rôle qu'il y tient (« mobile », « data »). */
    public ProjectMemberResponse updateMySpecialty(Long userId, Long projectId, MemberSpecialtyRequest request) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .filter(candidate -> candidate.getStatus() == MemberStatus.ACCEPTED)
                .orElseThrow(() -> new OperationNotAllowedException("Vous ne faites pas partie de l'équipe de ce projet"));
        member.setSpecialty(request.getSpecialty());
        log.info("[Project] Membre {} du projet {} : rôle {}", userId, projectId, request.getSpecialty());
        return projectMapper.toMemberResponse(projectMemberRepository.save(member));
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

        boolean leavesTeam = member.getStatus() == MemberStatus.ACCEPTED && request.getStatus() == MemberStatus.REJECTED;
        member.setStatus(request.getStatus());
        if (request.getRole() != null) {
            member.setRole(request.getRole());
        }
        if (request.getSpecialty() != null) {
            member.setSpecialty(request.getSpecialty());
        }
        ProjectMember saved = projectMemberRepository.save(member);
        log.info("[Project] Membre {} du projet {} : {} par {}", memberId, projectId, request.getStatus(), userId);
        if (saved.getStatus() == MemberStatus.ACCEPTED && saved.getOpening() != null) {
            closeWhenFilled(saved.getOpening());
        }
        if (leavesTeam) {
            eventPublisher.publishEvent(new ProjectMemberLeftEvent(projectId, saved.getUser().getId()));
        }
        return projectMapper.toMemberResponse(saved);
    }

    // Toutes les places du rôle sont prises : l'annonce se ferme, et reste dans l'historique du projet
    private void closeWhenFilled(ProjectOpening opening) {
        long accepted = projectMemberRepository.countByOpeningIdAndStatus(opening.getId(), MemberStatus.ACCEPTED);
        if (opening.isOpen() && accepted >= opening.getSeats()) {
            opening.setOpen(false);
            log.info("[Opening] ID: {} pourvue ({} / {}) : fermée", opening.getId(), accepted, opening.getSeats());
        }
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
        // Le hackathon à venir ou en cours de chaque projet : le plus proche, s'il y en a plusieurs
        Map<Long, HackathonBriefResponse> hackathons = hackathonTeamRepository.findCurrentByProjectIds(ids, Instant.now()).stream()
                .collect(Collectors.toMap(team -> team.getProject().getId(), team -> hackathonMapper.toBrief(team.getHackathon()),
                        (soonest, later) -> soonest));

        return projects.stream()
                .map(project -> {
                    ProjectResponse response = projectMapper.toResponse(project);
                    response.setMemberCount(memberCounts.getOrDefault(project.getId(), 0L));
                    response.setOpenings(openings.getOrDefault(project.getId(), List.of()));
                    response.setTeam(teams.getOrDefault(project.getId(), List.of()).stream().limit(TEAM_PREVIEW).toList());
                    response.setHackathon(hackathons.get(project.getId()));
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

    /**
     * Ce que seule la page du projet montre : sa galerie, son activité GitHub, et pour chaque rôle ouvert,
     * ses candidatures en attente ; pour un membre connecté qui n'est pas de l'équipe, sa compatibilité
     * avec chaque rôle (OpeningMatcher) et le rôle auquel il a déjà postulé.
     */
    private void addPageDetails(Project project, ProjectResponse response, Long currentUserId) {
        response.setGallery(mediaRepository.findByProjectIdOrderByPositionAscIdAsc(project.getId()).stream()
                .map(projectMapper::toMediaResponse)
                .toList());
        response.setGithub(githubActivityRepository.findByProjectId(project.getId())
                .map(projectMapper::toGithubResponse)
                .orElse(null));

        List<ProjectOpeningResponse> openings = response.getOpenings();
        if (openings.isEmpty()) {
            return;
        }
        Map<Long, Long> applicants = projectMemberRepository
                .countByOpeningIdsAndStatus(openings.stream().map(ProjectOpeningResponse::getId).toList(), MemberStatus.PENDING)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        openings.forEach(opening -> opening.setApplicants(applicants.getOrDefault(opening.getId(), 0L)));

        if (currentUserId == null || response.getMyMembershipStatus() == MemberStatus.ACCEPTED) {
            return;
        }
        Long appliedTo = projectMemberRepository.findByProjectIdAndUserId(project.getId(), currentUserId)
                .filter(member -> member.getStatus() == MemberStatus.PENDING && member.getOpening() != null)
                .map(member -> member.getOpening().getId())
                .orElse(null);
        List<String> skills = developerRepository.findById(currentUserId)
                .map(developer -> developer.getSkills().stream().map(Tag::getName).toList())
                .orElse(List.of());
        List<String> stack = project.getTags().stream().map(Tag::getName).toList();
        for (ProjectOpeningResponse opening : openings) {
            opening.setAppliedByMe(opening.getId().equals(appliedTo));
            opening.setMatch(openingMatcher.match(skills, opening.getRole(), stack).orElse(null));
        }
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
        project.setLicense(trimToNull(request.getLicense()));
    }

    // Les images que le projet montre lui-même : couverture, miniature, logo
    private static Set<String> imagesOf(Project project) {
        return Stream.of(project.getCoverUrl(), project.getCoverThumbnailUrl(), project.getLogoUrl())
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
    }

    // Une annonce ouverte de ce projet
    private ProjectOpening findOpenOpening(Project project, Long openingId) {
        ProjectOpening opening = projectOpeningRepository.findById(openingId)
                .filter(candidate -> candidate.getProject().getId().equals(project.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Annonce", openingId));
        if (!opening.isOpen()) {
            throw new OperationNotAllowedException("Ce rôle est déjà pourvu", "openingId");
        }
        return opening;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Project findProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet", projectId));
    }

    /** Le projet, s'il existe pour ce lecteur : un projet masqué n'existe plus que pour son équipe et les admins. */
    public Project findVisibleProjectOrThrow(Long projectId, Long viewerId) {
        return projectRepository.findById(projectId)
                .filter(project -> isVisibleTo(project, viewerId))
                .orElseThrow(() -> new ResourceNotFoundException("Projet", projectId));
    }

    /**
     * Un projet masqué par l'administration quitte la vitrine, les annonces et le fil ; son équipe le voit encore
     * (avec le motif), les admins aussi.
     */
    public boolean isVisibleTo(Project project, Long viewerId) {
        return !project.isHidden() || isTeamMember(project, viewerId) || userService.isAdmin(viewerId);
    }

    private void requireOwnerOrModerator(Project project, Long userId, String message) {
        if (!project.getOwner().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }

    /** Le porteur, ou un membre accepté de l'équipe (quel que soit son rôle). */
    public boolean isTeamMember(Project project, Long userId) {
        if (userId == null) {
            return false;
        }
        if (project.getOwner().getId().equals(userId)) {
            return true;
        }
        return projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .isPresent();
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
