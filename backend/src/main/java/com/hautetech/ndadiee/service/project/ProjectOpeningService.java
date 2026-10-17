package com.hautetech.ndadiee.service.project;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.OpeningRoleSummaryResponse;
import com.hautetech.ndadiee.dto.response.OpeningStackSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.specification.ProjectOpeningSpecifications;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Rôles recherchés par les projets (« annonces ») : publiés par le porteur ou un mainteneur, fermés
 * quand ils sont pourvus. Lecture publique : la liste filtrable, et le résumé par rôle de l'accueil.
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

    private final ProjectOpeningRepository openingRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final ProjectMapper projectMapper;

    // ==================== LECTURE ====================

    @Transactional(readOnly = true)
    public PageResponse<ProjectOpeningResponse> listOpen(TeamRole role, String q, String tag, Pageable pageable) {
        Page<ProjectOpening> page = openingRepository.findAll(ProjectOpeningSpecifications.open(role, q, tag), pageable);
        return PageResponse.from(page, page.getContent().stream().map(this::toResponseWithProject).toList());
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

    private ProjectOpeningResponse toResponseWithProject(ProjectOpening opening) {
        ProjectOpeningResponse response = projectMapper.toOpeningResponse(opening);
        response.setProject(projectMapper.toBrief(opening.getProject()));
        return response;
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
