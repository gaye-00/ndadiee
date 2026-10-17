package com.hautetech.ndadiee.service.hackathon;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.HackathonMilestoneRequest;
import com.hautetech.ndadiee.dto.request.HackathonRequest;
import com.hautetech.ndadiee.dto.request.HackathonResultRequest;
import com.hautetech.ndadiee.dto.request.HackathonTeamRequest;
import com.hautetech.ndadiee.dto.response.HackathonResponse;
import com.hautetech.ndadiee.dto.response.HackathonTeamResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.exception.ConflictException;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.HackathonMapper;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.hackathon.Hackathon;
import com.hautetech.ndadiee.model.hackathon.HackathonMilestone;
import com.hautetech.ndadiee.model.hackathon.HackathonPrize;
import com.hautetech.ndadiee.model.hackathon.HackathonStatus;
import com.hautetech.ndadiee.model.hackathon.HackathonTeam;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.repository.HackathonRepository;
import com.hautetech.ndadiee.repository.HackathonTeamRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.specification.HackathonSpecifications;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.project.ProjectService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Hackathons organisés sur la plateforme. L'équipe de modération les publie ; le porteur d'un projet
 * (ou un mainteneur) inscrit son équipe jusqu'à la clôture des inscriptions ; une fois le hackathon
 * terminé, la modération publie le palmarès. Lecture publique : la liste, la page d'un hackathon, et
 * ses équipes avec les rôles qu'elles recherchent encore.
 *
 * Le hackathon d'un projet (page et cartes des projets) est lu par ProjectService directement dans
 * HackathonTeamRepository : ce service dépend déjà de ProjectService.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class HackathonService {

    // Équipes montrées avec un hackathon dans une liste : le palmarès d'abord, puis les premières inscrites
    static final int TEAMS_PREVIEW = 4;
    // Visages d'une équipe dans la liste complète : le porteur et les premiers arrivés
    static final int MEMBERS_SHOWN = 6;
    // GET /v1/hackathons/me : les hackathons du membre connecté. Aucun hackathon ne peut prendre ce slug.
    private static final String RESERVED_SLUG = "me";

    private final HackathonRepository hackathonRepository;
    private final HackathonTeamRepository teamRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectOpeningRepository openingRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final TagService tagService;
    private final SlugService slugService;
    private final HackathonMapper hackathonMapper;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;

    // ==================== LECTURE ====================

    /**
     * Sans tri demandé : les hackathons à venir du plus proche au plus lointain, ceux en cours dans l'ordre
     * où ils finissent, les terminés (et la liste complète) du plus récent au plus ancien.
     */
    @Transactional(readOnly = true)
    public PageResponse<HackathonResponse> list(HackathonStatus status, String q, String tag, Long currentUserId,
            Pageable pageable) {
        Instant now = Instant.now();
        Pageable sorted = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), defaultSort(status));
        Page<Hackathon> page = hackathonRepository.findAll(HackathonSpecifications.filter(status, q, tag, now), sorted);
        return PageResponse.from(page, toResponses(page.getContent(), currentUserId, now));
    }

    @Transactional(readOnly = true)
    public HackathonResponse getBySlug(String slug, Long currentUserId) {
        Hackathon hackathon = hackathonRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon", "slug", slug));
        return toResponse(hackathon, currentUserId);
    }

    /**
     * Toutes les équipes, le palmarès d'abord puis par ordre d'inscription : leurs membres, et avant le coup
     * d'envoi, les rôles qu'elles cherchent encore.
     */
    @Transactional(readOnly = true)
    public List<HackathonTeamResponse> getTeams(Long hackathonId) {
        Hackathon hackathon = findOrThrow(hackathonId);
        boolean recruiting = isRecruiting(hackathon, Instant.now());
        List<HackathonTeam> teams = teamRepository.findWithProjectByHackathonIds(List.of(hackathonId));
        TeamDetails details = teamDetails(teams.stream().map(team -> team.getProject().getId()).toList(), true);
        return teams.stream().map(team -> fullTeam(team, details, recruiting)).toList();
    }

    /**
     * Les hackathons à venir ou en cours où le membre a une équipe (un projet dont il fait partie), le plus
     * proche d'abord, chacun avec son équipe et les rôles qu'elle cherche encore.
     */
    @Transactional(readOnly = true)
    public List<HackathonResponse> mine(Long userId) {
        Instant now = Instant.now();
        List<Hackathon> hackathons = teamRepository.findCurrentForMember(userId, MemberStatus.ACCEPTED, now).stream()
                .map(HackathonTeam::getHackathon)
                .distinct()
                .toList();
        return toResponses(hackathons, userId, now);
    }

    // ==================== ORGANISATION (modération) ====================

    public HackathonResponse create(Long userId, HackathonRequest request) {
        requireModerator(userId, "Seule l'équipe de modération publie des hackathons");

        Hackathon hackathon = Hackathon.builder()
                .slug(slugService.generateUniqueSlug(request.getTitle(),
                        slug -> RESERVED_SLUG.equals(slug) || hackathonRepository.existsBySlug(slug)))
                .createdBy(userService.findUserOrThrow(userId))
                .build();
        apply(hackathon, request);

        Hackathon saved = hackathonRepository.save(hackathon);
        log.info("[Hackathon] Créé - ID: {} - slug: {}", saved.getId(), saved.getSlug());
        return toResponse(saved, userId);
    }

    public HackathonResponse update(Long userId, Long hackathonId, HackathonRequest request) {
        requireModerator(userId, "Seule l'équipe de modération modifie les hackathons");
        Hackathon hackathon = findOrThrow(hackathonId);

        // Le slug ne suit pas le titre : les liens déjà partagés restent valides
        apply(hackathon, request);

        log.info("[Hackathon] ID: {} mis à jour par {}", hackathonId, userId);
        // saveAndFlush : la réponse doit porter le programme et les prix tels qu'enregistrés
        return toResponse(hackathonRepository.saveAndFlush(hackathon), userId);
    }

    /** Supprime le hackathon et ses inscriptions ; les projets, eux, restent. */
    public void delete(Long userId, Long hackathonId) {
        requireModerator(userId, "Seule l'équipe de modération supprime les hackathons");
        Hackathon hackathon = findOrThrow(hackathonId);

        tagService.releaseTags(hackathon.getTags());
        hackathonRepository.delete(hackathon);
        log.info("[Hackathon] ID: {} supprimé par {}", hackathonId, userId);
    }

    // ==================== ÉQUIPES ====================

    /**
     * Inscrit un projet comme équipe : par son porteur ou un mainteneur, avant la clôture des inscriptions,
     * s'il reste de la place, si l'équipe ne dépasse pas la taille permise et si le projet n'est pas déjà
     * pris par un hackathon aux mêmes dates. Une équipe incomplète peut s'inscrire : elle recrute par ses
     * annonces.
     */
    public HackathonTeamResponse register(Long userId, Long hackathonId, HackathonTeamRequest request) {
        Hackathon hackathon = findOrThrow(hackathonId);
        Project project = projectService.findProjectOrThrow(request.getProjectId());
        if (!projectService.canManage(project, userId)) {
            throw new ForbiddenException("Seuls le porteur du projet et ses mainteneurs inscrivent son équipe");
        }
        if (!Instant.now().isBefore(hackathon.getRegistrationClosesAt())) {
            throw new OperationNotAllowedException("Les inscriptions à ce hackathon sont closes");
        }
        if (teamRepository.existsByHackathonIdAndProjectId(hackathonId, project.getId())) {
            throw new ConflictException("Ce projet est déjà inscrit à ce hackathon");
        }
        if (hackathon.getMaxTeams() != null && teamRepository.countByHackathonId(hackathonId) >= hackathon.getMaxTeams()) {
            throw new OperationNotAllowedException(
                    "Ce hackathon affiche complet : " + hackathon.getMaxTeams() + " équipes inscrites");
        }
        long members = memberRepository.countByProjectIdAndStatus(project.getId(), MemberStatus.ACCEPTED);
        if (members > hackathon.getMaxTeamSize()) {
            throw new OperationNotAllowedException("L'équipe compte " + members + " membres : ce hackathon en accepte "
                    + hackathon.getMaxTeamSize() + " au plus", "projectId");
        }
        if (teamRepository.existsOverlapping(project.getId(), hackathon.getStartsAt(), hackathon.getEndsAt())) {
            throw new OperationNotAllowedException("Ce projet participe déjà à un hackathon aux mêmes dates", "projectId");
        }

        HackathonTeam team = HackathonTeam.builder()
                .hackathon(hackathon)
                .project(project)
                .registeredBy(userService.getDeveloperOrThrow(userId))
                .pitch(trimToNull(request.getPitch()))
                .build();
        hackathon.getTeams().add(team);

        HackathonTeam saved = teamRepository.save(team);
        log.info("[Hackathon] Équipe inscrite - hackathon {} - projet {} par {}", hackathonId, project.getId(), userId);
        return fullTeam(saved, teamDetails(List.of(project.getId()), true), true);
    }

    /** Retire l'équipe d'un projet, avant le coup d'envoi : par son porteur, un mainteneur ou la modération. */
    public void withdraw(Long userId, Long hackathonId, Long projectId) {
        HackathonTeam team = findTeamOrThrow(hackathonId, projectId);
        if (!projectService.canManage(team.getProject(), userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Seuls le porteur du projet et ses mainteneurs retirent son équipe");
        }
        Hackathon hackathon = team.getHackathon();
        if (!Instant.now().isBefore(hackathon.getStartsAt())) {
            throw new OperationNotAllowedException("Le hackathon a commencé : l'équipe ne peut plus se retirer");
        }

        hackathon.getTeams().remove(team);
        teamRepository.delete(team);
        log.info("[Hackathon] Équipe retirée - hackathon {} - projet {} par {}", hackathonId, projectId, userId);
    }

    /**
     * Inscrit au palmarès la place d'une équipe (une seule équipe par place) et, ou, sa distinction ; des
     * valeurs vides les retirent. Une fois le hackathon terminé, et par la modération seulement.
     */
    public HackathonTeamResponse setResult(Long userId, Long hackathonId, Long projectId, HackathonResultRequest request) {
        requireModerator(userId, "Seule l'équipe de modération publie le palmarès");
        HackathonTeam team = findTeamOrThrow(hackathonId, projectId);
        if (HackathonStatus.of(team.getHackathon(), Instant.now()) != HackathonStatus.ENDED) {
            throw new OperationNotAllowedException("Le palmarès se publie une fois le hackathon terminé");
        }
        if (request.getRank() != null) {
            teamRepository.findByHackathonIdAndRank(hackathonId, request.getRank())
                    .filter(other -> !other.getId().equals(team.getId()))
                    .ifPresent(other -> {
                        throw new OperationNotAllowedException("La place n°" + request.getRank() + " revient déjà à "
                                + other.getProject().getName(), "rank");
                    });
        }

        team.setRank(request.getRank());
        team.setAward(trimToNull(request.getAward()));

        HackathonTeam saved = teamRepository.saveAndFlush(team);
        log.info("[Hackathon] Palmarès - hackathon {} - projet {} : place {}, distinction {}", hackathonId, projectId,
                saved.getRank(), saved.getAward());
        return fullTeam(saved, teamDetails(List.of(projectId), true), false);
    }

    // ==================== RÉPONSES ====================

    private HackathonResponse toResponse(Hackathon hackathon, Long currentUserId) {
        return toResponses(List.of(hackathon), currentUserId, Instant.now()).get(0);
    }

    /**
     * Convertit une liste de hackathons en ajoutant ce qui ne vient pas de l'entité : statut à l'heure dite,
     * équipes, places qu'elles cherchent encore avant le coup d'envoi, et pour un membre connecté, son équipe.
     * Quatre requêtes pour toute la liste.
     */
    private List<HackathonResponse> toResponses(List<Hackathon> hackathons, Long currentUserId, Instant now) {
        if (hackathons.isEmpty()) {
            return List.of();
        }
        List<HackathonTeam> teams = teamRepository.findWithProjectByHackathonIds(hackathons.stream().map(Hackathon::getId).toList());
        Map<Long, List<HackathonTeam>> teamsByHackathon = teams.stream()
                .collect(Collectors.groupingBy(team -> team.getHackathon().getId()));
        List<Long> projectIds = teams.stream().map(team -> team.getProject().getId()).distinct().toList();
        TeamDetails details = teamDetails(projectIds, false);
        Set<Long> myProjectIds = myProjectIds(currentUserId, projectIds);

        return hackathons.stream()
                .map(hackathon -> {
                    List<HackathonTeam> own = teamsByHackathon.getOrDefault(hackathon.getId(), List.of());
                    boolean recruiting = isRecruiting(hackathon, now);
                    List<ProjectOpening> sought = !recruiting
                            ? List.<ProjectOpening>of()
                            : own.stream()
                                    .flatMap(team -> details.openings().getOrDefault(team.getProject().getId(), List.of()).stream())
                                    .toList();

                    HackathonResponse response = hackathonMapper.toResponse(hackathon);
                    response.setStatus(HackathonStatus.of(hackathon, now));
                    response.setRegistrationOpen(isRegistrationOpen(hackathon, own.size(), now));
                    response.setTeamCount(own.size());
                    response.setOpenSeats(sought.stream().mapToInt(ProjectOpening::getSeats).sum());
                    // L'ordre de l'énumération est celui du catalogue des rôles
                    response.setRolesSought(sought.stream().map(ProjectOpening::getRole).distinct().sorted().toList());
                    response.setTeams(own.stream().limit(TEAMS_PREVIEW).map(team -> teamPreview(team, details)).toList());
                    own.stream()
                            .filter(team -> myProjectIds.contains(team.getProject().getId()))
                            .findFirst()
                            .ifPresent(team -> response.setMyTeam(teamWithOpenings(team, details, recruiting)));
                    return response;
                })
                .toList();
    }

    /**
     * Ce que les équipes tiennent de leur projet : le nombre de membres acceptés, les rôles ouverts, et pour
     * la liste complète, les visages de l'équipe.
     */
    private record TeamDetails(Map<Long, Long> memberCounts, Map<Long, List<ProjectOpening>> openings,
            Map<Long, List<UserSummaryResponse>> members) {
    }

    // Deux ou trois requêtes pour toutes les équipes
    private TeamDetails teamDetails(List<Long> projectIds, boolean withMembers) {
        if (projectIds.isEmpty()) {
            return new TeamDetails(Map.of(), Map.of(), Map.of());
        }
        Map<Long, Long> memberCounts = memberRepository.countByProjectIdsAndStatus(projectIds, MemberStatus.ACCEPTED).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Map<Long, List<ProjectOpening>> openings = openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(projectIds).stream()
                .collect(Collectors.groupingBy(opening -> opening.getProject().getId()));
        Map<Long, List<UserSummaryResponse>> members = !withMembers
                ? Map.of()
                : memberRepository.findWithUserByProjectIdsAndStatus(projectIds, MemberStatus.ACCEPTED).stream()
                        .collect(Collectors.groupingBy(member -> member.getProject().getId(),
                                Collectors.mapping(member -> userMapper.toSummary(member.getUser()), Collectors.toList())));
        return new TeamDetails(memberCounts, openings, members);
    }

    private HackathonTeamResponse teamPreview(HackathonTeam team, TeamDetails details) {
        HackathonTeamResponse response = hackathonMapper.toTeamResponse(team);
        response.setMemberCount(details.memberCounts().getOrDefault(team.getProject().getId(), 0L));
        return response;
    }

    // Les rôles ouverts de l'équipe, tant qu'elle peut encore recruter pour ce hackathon
    private HackathonTeamResponse teamWithOpenings(HackathonTeam team, TeamDetails details, boolean recruiting) {
        HackathonTeamResponse response = teamPreview(team, details);
        response.setOpenings(!recruiting
                ? List.of()
                : details.openings().getOrDefault(team.getProject().getId(), List.of()).stream()
                        .map(projectMapper::toOpeningResponse)
                        .toList());
        return response;
    }

    private HackathonTeamResponse fullTeam(HackathonTeam team, TeamDetails details, boolean recruiting) {
        HackathonTeamResponse response = teamWithOpenings(team, details, recruiting);
        response.setMembers(details.members().getOrDefault(team.getProject().getId(), List.of()).stream()
                .limit(MEMBERS_SHOWN)
                .toList());
        return response;
    }

    // Les projets de cette liste dont le membre fait partie
    private Set<Long> myProjectIds(Long userId, List<Long> projectIds) {
        if (userId == null || projectIds.isEmpty()) {
            return Set.of();
        }
        return memberRepository.findByUserIdAndProjectIdIn(userId, projectIds).stream()
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .map(member -> member.getProject().getId())
                .collect(Collectors.toSet());
    }

    // ==================== HELPERS ====================

    // Champs que l'organisation renseigne, à la création comme à la modification
    private void apply(Hackathon hackathon, HackathonRequest request) {
        if (!request.getEndsAt().isAfter(request.getStartsAt())) {
            throw new OperationNotAllowedException("La fin du hackathon doit suivre son début", "endsAt");
        }
        if (request.getRegistrationClosesAt().isAfter(request.getStartsAt())) {
            throw new OperationNotAllowedException("Les inscriptions ferment au plus tard au coup d'envoi",
                    "registrationClosesAt");
        }
        if (request.getMinTeamSize() > request.getMaxTeamSize()) {
            throw new OperationNotAllowedException("La taille minimale des équipes dépasse leur taille maximale",
                    "minTeamSize");
        }
        String city = trimToNull(request.getCity());
        if (request.getFormat() != WorkMode.REMOTE && (city == null || request.getCountry() == null)) {
            throw new OperationNotAllowedException("Un hackathon sur place indique sa ville et son pays", "city");
        }

        hackathon.setTitle(request.getTitle().trim());
        hackathon.setTagline(trimToNull(request.getTagline()));
        hackathon.setDescription(request.getDescription().strip());
        hackathon.setOrganizerName(request.getOrganizerName().trim());
        hackathon.setFormat(request.getFormat());
        hackathon.setCountry(request.getCountry() == null ? null : request.getCountry().toUpperCase(Locale.ROOT));
        hackathon.setCity(city);
        hackathon.setTimezone(zoneOf(request.getTimezone()));
        hackathon.setStartsAt(request.getStartsAt());
        hackathon.setEndsAt(request.getEndsAt());
        hackathon.setRegistrationClosesAt(request.getRegistrationClosesAt());
        hackathon.setPrizePool(trimToNull(request.getPrizePool()));
        hackathon.setMinTeamSize(request.getMinTeamSize());
        hackathon.setMaxTeamSize(request.getMaxTeamSize());
        hackathon.setMaxTeams(request.getMaxTeams());
        tagService.replaceTags(hackathon.getTags(), request.getTags());

        hackathon.getSchedule().clear();
        if (request.getSchedule() != null) {
            request.getSchedule().stream()
                    .sorted(Comparator.comparing(HackathonMilestoneRequest::getScheduledAt))
                    .map(item -> HackathonMilestone.builder()
                            .scheduledAt(item.getScheduledAt())
                            .label(item.getLabel().trim())
                            .build())
                    .forEach(hackathon.getSchedule()::add);
        }
        hackathon.getPrizes().clear();
        if (request.getPrizes() != null) {
            request.getPrizes().stream()
                    .map(prize -> HackathonPrize.builder().title(prize.getTitle().trim()).reward(prize.getReward().trim()).build())
                    .forEach(hackathon.getPrizes()::add);
        }
    }

    // Un fuseau connu (« Africa/Dakar »), sous sa forme canonique
    private static String zoneOf(String timezone) {
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (DateTimeException e) {
            throw new OperationNotAllowedException("Fuseau horaire inconnu : " + timezone, "timezone");
        }
    }

    private static Sort defaultSort(HackathonStatus status) {
        Sort byDate = switch (status) {
            case UPCOMING -> Sort.by("startsAt").ascending();
            case ONGOING -> Sort.by("endsAt").ascending();
            case ENDED -> Sort.by("endsAt").descending();
            case null -> Sort.by("startsAt").descending();
        };
        return byDate.and(Sort.by("id"));
    }

    // Une équipe recrute pour un hackathon jusqu'au coup d'envoi ; ensuite, ses annonces sont celles du projet
    private static boolean isRecruiting(Hackathon hackathon, Instant now) {
        return HackathonStatus.of(hackathon, now) == HackathonStatus.UPCOMING;
    }

    private static boolean isRegistrationOpen(Hackathon hackathon, long teamCount, Instant now) {
        return now.isBefore(hackathon.getRegistrationClosesAt())
                && (hackathon.getMaxTeams() == null || teamCount < hackathon.getMaxTeams());
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Hackathon findOrThrow(Long hackathonId) {
        return hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon", hackathonId));
    }

    private HackathonTeam findTeamOrThrow(Long hackathonId, Long projectId) {
        return teamRepository.findByHackathonIdAndProjectId(hackathonId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Équipe du hackathon", "projet", String.valueOf(projectId)));
    }

    private void requireModerator(Long userId, String message) {
        if (!userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }
}
