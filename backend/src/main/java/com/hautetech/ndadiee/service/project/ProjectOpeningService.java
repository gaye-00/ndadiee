package com.hautetech.ndadiee.service.project;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.Pageables;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse.CountryFacet;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse.RoleFacet;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse.StackFacet;
import com.hautetech.ndadiee.dto.response.OpeningMatchResponse;
import com.hautetech.ndadiee.dto.response.OpeningRoleSummaryResponse;
import com.hautetech.ndadiee.dto.response.OpeningStackSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.TagMapper;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.specification.OpeningFilter;
import com.hautetech.ndadiee.repository.specification.ProjectOpeningSpecifications;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Rôles recherchés par les projets (« annonces ») : publiés par le porteur ou un mainteneur, fermés
 * quand ils sont pourvus. Lecture publique : la liste filtrable et ses facettes (page des annonces), une
 * annonce seule, le résumé par rôle et par technologie (accueil).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectOpeningService {

    // Projets cités pour un rôle dans le résumé de l'accueil
    static final int PROJECTS_PER_ROLE = 4;
    // Technologies renvoyées au plus par le résumé par technologie
    static final int MAX_STACKS = 30;
    // Ordres calculés ici plutôt qu'en base : la compatibilité avec le profil du membre connecté, les plus
    // proches d'abord ; les candidatures en attente, les annonces les moins demandées d'abord
    static final String BY_MATCH = "match";
    static final String BY_APPLICANTS = "applicants";
    // À égalité, et pour un visiteur qui demande l'ordre de compatibilité : les plus récentes
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final ProjectOpeningRepository openingRepository;
    private final ProjectMemberRepository memberRepository;
    private final DeveloperRepository developerRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final OpeningMatcher openingMatcher;
    private final ProjectMapper projectMapper;
    private final TagMapper tagMapper;

    // ==================== LECTURE ====================

    /**
     * Les annonces ouvertes des filtres, page après page, avec leur projet (technologies, dépôt) et leurs
     * candidatures en attente ; pour un membre connecté, sa participation au projet, sa compatibilité avec
     * le rôle et sa candidature.
     *
     * L'ordre demandé (createdAt, seats…) est départagé par l'identifiant : d'une page à l'autre, une annonce
     * n'est ni vue deux fois ni sautée. « match » et « applicants » se calculent sur toutes les annonces des
     * filtres ; à égalité, les plus récentes d'abord. Un visiteur n'a pas de profil : « match » lui donne les
     * plus récentes.
     */
    @Transactional(readOnly = true)
    public PageResponse<ProjectOpeningResponse> list(OpeningFilter filter, Long currentUserId, Pageable pageable) {
        Specification<ProjectOpening> matching = ProjectOpeningSpecifications.filter(filter);
        Sort sort = pageable.getSort();
        boolean byMatch = sort.getOrderFor(BY_MATCH) != null;
        boolean byApplicants = sort.getOrderFor(BY_APPLICANTS) != null;

        if (!byApplicants && (!byMatch || currentUserId == null)) {
            Pageable inDatabase = byMatch
                    ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), NEWEST_FIRST)
                    : Pageables.inTotalOrder(pageable);
            Page<ProjectOpening> page = openingRepository.findAll(matching, inDatabase);
            Context context = contextOf(page.getContent(), currentUserId);
            return PageResponse.from(page, page.getContent().stream().map(opening -> toResponse(opening, context)).toList());
        }

        // Le tri est stable : à égalité, les annonces gardent l'ordre de la base, les plus récentes d'abord
        List<ProjectOpening> all = openingRepository.findAll(matching, NEWEST_FIRST);
        Context context = contextOf(all, currentUserId);
        Comparator<ProjectOpening> order = byMatch
                ? Comparator.comparingInt(context::scoreOf).reversed()
                : Comparator.comparingLong(context::applicantsOf);
        List<ProjectOpening> sorted = all.stream().sorted(order).toList();
        int from = (int) Math.min(pageable.getOffset(), sorted.size());
        List<ProjectOpening> slice = sorted.subList(from, Math.min(from + pageable.getPageSize(), sorted.size()));
        Page<ProjectOpening> page = new PageImpl<>(slice, pageable, sorted.size());
        return PageResponse.from(page, slice.stream().map(opening -> toResponse(opening, context)).toList());
    }

    /**
     * Facettes des annonces : pour chaque rôle, technologie et pays du porteur, le nombre d'annonces que
     * donnerait ce choix avec les autres filtres de la recherche ; et pour « Toutes ». Pour toutes les
     * annonces des filtres : places proposées, projets, et celles qui n'ont aucune candidature en attente.
     */
    @Transactional(readOnly = true)
    public OpeningFacetsResponse facets(OpeningFilter filter) {
        Specification<ProjectOpening> matching = ProjectOpeningSpecifications.filter(filter);
        Specification<ProjectOpening> anyRole = ProjectOpeningSpecifications.filter(filter.withoutRole());

        List<RoleFacet> roles = openingRepository.countByRole(anyRole).stream()
                .map(row -> new RoleFacet((TeamRole) row[0], ((Number) row[1]).longValue(), ((Number) row[2]).longValue()))
                .sorted(Comparator.comparing(RoleFacet::role))
                .toList();
        List<StackFacet> stacks = openingRepository.countByTag(ProjectOpeningSpecifications.filter(filter.withoutTag())).stream()
                .map(row -> new StackFacet((String) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();
        List<CountryFacet> countries = openingRepository.countByOwnerCountry(ProjectOpeningSpecifications.filter(filter.withoutCountry()))
                .stream()
                .map(row -> new CountryFacet((String) row[0], ((Number) row[1]).longValue()))
                .sorted(Comparator.comparingLong(CountryFacet::openings).reversed().thenComparing(CountryFacet::country))
                .toList();

        return OpeningFacetsResponse.builder()
                .total(openingRepository.count(matching))
                .seats(openingRepository.sumSeats(matching))
                .projects(openingRepository.countProjects(matching))
                .unclaimed(openingRepository.countWithoutApplicants(matching))
                .all(openingRepository.count(anyRole))
                .roles(roles)
                .stacks(stacks)
                .countries(countries)
                .build();
    }

    /**
     * Une annonce, ouverte ou déjà pourvue, comme dans la liste : pour reprendre une candidature après la
     * connexion, ou suivre un lien partagé.
     */
    @Transactional(readOnly = true)
    public ProjectOpeningResponse get(Long openingId, Long currentUserId) {
        ProjectOpening opening = openingRepository.findById(openingId)
                .filter(found -> projectService.isVisibleTo(found.getProject(), currentUserId))
                .orElseThrow(() -> new ResourceNotFoundException("Annonce", openingId));
        return toResponse(opening, contextOf(List.of(opening), currentUserId));
    }

    /**
     * Les rôles où l'on recrute en ce moment, dans l'ordre du catalogue : nombre d'annonces, de places,
     * et les projets concernés (les plus récents d'abord). Les rôles sans annonce n'y sont pas.
     */
    @Transactional(readOnly = true)
    public List<OpeningRoleSummaryResponse> summaryByRole() {
        Map<TeamRole, List<ProjectOpening>> byRole = openingRepository.findAllOpenWithProject().stream()
                .collect(Collectors.groupingBy(ProjectOpening::getRole, () -> new EnumMap<>(TeamRole.class),
                        Collectors.toList()));

        return byRole.entrySet().stream()
                .map(entry -> {
                    List<ProjectOpening> openings = entry.getValue();
                    List<ProjectBriefResponse> projects = openings.stream()
                            .map(ProjectOpening::getProject)
                            .distinct()
                            .limit(PROJECTS_PER_ROLE)
                            .map(projectMapper::toBrief)
                            .toList();
                    return OpeningRoleSummaryResponse.builder()
                            .role(entry.getKey())
                            .openings(openings.size())
                            .seats(openings.stream().mapToInt(ProjectOpening::getSeats).sum())
                            .projects(projects)
                            .build();
                })
                .toList();
    }

    /**
     * Les technologies des projets qui recrutent, les plus demandées d'abord ; à égalité, les plus
     * utilisées sur la plateforme, puis par nom. Pour chacune : annonces ouvertes, places, et les projets
     * concernés. Chacune mène à ses annonces : GET /v1/openings?tag={slug}.
     */
    @Transactional(readOnly = true)
    public List<OpeningStackSummaryResponse> summaryByStack(int limit) {
        Map<String, StackTally> tallies = new LinkedHashMap<>();
        for (Object[] row : openingRepository.countOpenByStackAndProject()) {
            StackTally tally = tallies.computeIfAbsent((String) row[0],
                    slug -> new StackTally(slug, (String) row[1], ((Number) row[2]).intValue()));
            tally.projectIds.add(((Number) row[3]).longValue());
            tally.openings += ((Number) row[4]).intValue();
            tally.seats += ((Number) row[5]).intValue();
        }
        return tallies.values().stream()
                .sorted(Comparator.comparingInt((StackTally tally) -> tally.openings).reversed()
                        .thenComparing(Comparator.comparingInt((StackTally tally) -> tally.usage).reversed())
                        .thenComparing(tally -> tally.name, String.CASE_INSENSITIVE_ORDER))
                .limit(Math.clamp(limit, 1, MAX_STACKS))
                .map(tally -> OpeningStackSummaryResponse.builder()
                        .slug(tally.slug)
                        .name(tally.name)
                        .openings(tally.openings)
                        .seats(tally.seats)
                        .projects(tally.projectIds.size())
                        .projectIds(tally.projectIds.stream().sorted().toList())
                        .build())
                .toList();
    }

    // Les annonces d'une technologie, projet après projet
    private static final class StackTally {
        private final String slug;
        private final String name;
        private final int usage;
        private final List<Long> projectIds = new ArrayList<>();
        private int openings;
        private int seats;

        private StackTally(String slug, String name, int usage) {
            this.slug = slug;
            this.name = name;
            this.usage = usage;
        }
    }

    // ==================== ÉCRITURE ====================

    public ProjectOpeningResponse create(Long userId, Long projectId, ProjectOpeningRequest request) {
        Project project = projectService.findProjectOrThrow(projectId);
        requireManager(project, userId);

        ProjectOpening opening = ProjectOpening.builder().project(project).build();
        apply(opening, request);
        project.getOpenings().add(opening);
        // Publier un rôle, c'est recruter : le projet apparaît parmi ceux qui cherchent des contributeurs
        project.setLookingForContributors(true);

        ProjectOpening saved = openingRepository.save(opening);
        log.info("[Opening] Créée - ID: {} - projet {} - rôle {}", saved.getId(), projectId, saved.getRole());
        return projectMapper.toOpeningResponse(saved);
    }

    public ProjectOpeningResponse update(Long userId, Long openingId, ProjectOpeningRequest request) {
        ProjectOpening opening = findOrThrow(openingId);
        requireManager(opening.getProject(), userId);
        apply(opening, request);
        log.info("[Opening] ID: {} mise à jour par {}", openingId, userId);
        return projectMapper.toOpeningResponse(openingRepository.saveAndFlush(opening));
    }

    /** Ferme un rôle pourvu, ou le rouvre. */
    public ProjectOpeningResponse setOpen(Long userId, Long openingId, boolean open) {
        ProjectOpening opening = findOrThrow(openingId);
        requireManager(opening.getProject(), userId);
        opening.setOpen(open);
        log.info("[Opening] ID: {} {} par {}", openingId, open ? "rouverte" : "fermée", userId);
        return projectMapper.toOpeningResponse(openingRepository.saveAndFlush(opening));
    }

    public void delete(Long userId, Long openingId) {
        ProjectOpening opening = findOrThrow(openingId);
        requireManager(opening.getProject(), userId);
        opening.getProject().getOpenings().remove(opening);
        openingRepository.delete(opening);
        log.info("[Opening] ID: {} supprimée par {}", openingId, userId);
    }

    // ==================== HELPERS ====================

    /**
     * Ce qui accompagne une liste d'annonces sans venir de l'entité : candidatures en attente, et pour un
     * membre connecté, sa participation à chaque projet et sa compatibilité avec chaque rôle hors de ses
     * équipes. Trois requêtes pour toute la liste, quatre avec un membre connecté.
     */
    private Context contextOf(List<ProjectOpening> openings, Long currentUserId) {
        if (openings.isEmpty()) {
            return new Context(currentUserId, Map.of(), Map.of(), Map.of());
        }
        Map<Long, Long> applicants = memberRepository
                .countByOpeningIdsAndStatus(openings.stream().map(ProjectOpening::getId).toList(), MemberStatus.PENDING)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        if (currentUserId == null) {
            return new Context(null, applicants, Map.of(), Map.of());
        }

        List<Long> projectIds = openings.stream().map(opening -> opening.getProject().getId()).distinct().toList();
        Map<Long, ProjectMember> memberships = memberRepository.findByUserIdAndProjectIdIn(currentUserId, projectIds).stream()
                .collect(Collectors.toMap(member -> member.getProject().getId(), Function.identity()));
        List<String> skills = developerRepository.findById(currentUserId)
                .map(developer -> developer.getSkills().stream().map(Tag::getName).toList())
                .orElse(List.of());
        Map<Long, OpeningMatchResponse> matches = new HashMap<>();
        for (ProjectOpening opening : openings) {
            ProjectMember membership = memberships.get(opening.getProject().getId());
            // L'équipe ne postule pas à ses propres annonces : pas de compatibilité pour elle
            if (membership != null && membership.getStatus() == MemberStatus.ACCEPTED) {
                continue;
            }
            List<String> stack = opening.getProject().getTags().stream().map(Tag::getName).toList();
            openingMatcher.match(skills, opening.getRole(), stack).ifPresent(match -> matches.put(opening.getId(), match));
        }
        return new Context(currentUserId, applicants, memberships, matches);
    }

    /**
     * Le contexte d'une liste d'annonces (contextOf). Pour un visiteur, ni participations ni compatibilités.
     *
     * @param memberships participation du membre connecté, par projet
     * @param matches     sa compatibilité, par annonce ; absente si aucune de ses compétences ne compte
     */
    private record Context(Long viewerId, Map<Long, Long> applicants, Map<Long, ProjectMember> memberships,
            Map<Long, OpeningMatchResponse> matches) {

        long applicantsOf(ProjectOpening opening) {
            return applicants.getOrDefault(opening.getId(), 0L);
        }

        int scoreOf(ProjectOpening opening) {
            OpeningMatchResponse match = matches.get(opening.getId());
            return match == null ? 0 : match.getScore();
        }
    }

    // L'annonce, son projet (avec ses technologies) et ce que le contexte y ajoute
    private ProjectOpeningResponse toResponse(ProjectOpening opening, Context context) {
        Project project = opening.getProject();
        ProjectBriefResponse brief = projectMapper.toBrief(project);
        brief.setTags(tagMapper.toResponses(project.getTags()));
        ProjectOpeningResponse response = projectMapper.toOpeningResponse(opening);
        response.setProject(brief);
        response.setApplicants(context.applicantsOf(opening));
        if (context.viewerId() != null) {
            ProjectMember membership = context.memberships().get(project.getId());
            brief.setMyMembershipStatus(membership == null ? null : membership.getStatus());
            response.setAppliedByMe(membership != null && membership.getStatus() == MemberStatus.PENDING
                    && membership.getOpening() != null && membership.getOpening().getId().equals(opening.getId()));
            response.setMatch(context.matches().get(opening.getId()));
        }
        return response;
    }

    private void apply(ProjectOpening opening, ProjectOpeningRequest request) {
        opening.setRole(request.getRole());
        opening.setTitle(request.getTitle().trim());
        opening.setDescription(request.getDescription() == null || request.getDescription().isBlank()
                ? null : request.getDescription().trim());
        opening.setSeats(request.getSeats() == null ? 1 : request.getSeats());
        opening.setStarterIssueNumber(request.getStarterIssueNumber());
        opening.setStarterIssueTitle(request.getStarterIssueTitle() == null || request.getStarterIssueTitle().isBlank()
                ? null : request.getStarterIssueTitle().trim());
    }

    private ProjectOpening findOrThrow(Long openingId) {
        return openingRepository.findById(openingId)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce", openingId));
    }

    // Le porteur, ses mainteneurs, ou un modérateur
    private void requireManager(Project project, Long userId) {
        if (!projectService.canManage(project, userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Seuls le porteur du projet et ses mainteneurs gèrent ses annonces");
        }
    }
}
