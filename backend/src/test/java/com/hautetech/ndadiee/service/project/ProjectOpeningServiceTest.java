package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.OpeningRoleSummaryResponse;
import com.hautetech.ndadiee.dto.response.OpeningStackSummaryResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Annonces : seuls le porteur et ses mainteneurs les gèrent ; l'accueil les résume par rôle et par
 * technologie.
 */
@ExtendWith(MockitoExtension.class)
class ProjectOpeningServiceTest {

    private static final Long MANAGER = 1L;
    private static final Long STRANGER = 2L;
    private static final Long PROJECT_ID = 10L;

    @Mock
    private ProjectOpeningRepository openingRepository;

    @Mock
    private ProjectService projectService;

    @Mock
    private UserService userService;

    @Mock
    private ProjectMapper projectMapper;

    @InjectMocks
    private ProjectOpeningService openingService;

    private static Project project(long id) {
        return Project.builder().id(id).name("projet-" + id).slug("projet-" + id).build();
    }

    private static ProjectOpening opening(Project project, TeamRole role, int seats) {
        return ProjectOpening.builder().project(project).role(role).title(role.name()).seats(seats).build();
    }

    private static ProjectOpeningRequest request(TeamRole role, Integer seats) {
        return ProjectOpeningRequest.builder().role(role).title("  Dev mobile React Native ").seats(seats).build();
    }

    @Test
    void summaryGroupsOpenRolesInCatalogOrderWithSeatsAndDistinctProjects() {
        Project lagos = project(1);
        Project kawral = project(2);
        when(openingRepository.findAllOpenWithProject()).thenReturn(List.of(
                opening(kawral, TeamRole.MOBILE, 2),
                opening(lagos, TeamRole.DESIGN, 1),
                opening(lagos, TeamRole.MOBILE, 1),
                opening(kawral, TeamRole.MOBILE, 1)));
        when(projectMapper.toBrief(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            return ProjectBriefResponse.builder().id(project.getId()).name(project.getName()).build();
        });

        List<OpeningRoleSummaryResponse> summary = openingService.summaryByRole();

        // MOBILE vient avant DESIGN dans le catalogue, quel que soit l'ordre des annonces
        assertThat(summary).extracting(OpeningRoleSummaryResponse::getRole).containsExactly(TeamRole.MOBILE, TeamRole.DESIGN);
        OpeningRoleSummaryResponse mobile = summary.get(0);
        assertThat(mobile.getOpenings()).isEqualTo(3);
        assertThat(mobile.getSeats()).isEqualTo(4);
        // Kawral a deux annonces MOBILE : il n'est cité qu'une fois, avant lagos (plus récent d'abord)
        assertThat(mobile.getProjects()).extracting(ProjectBriefResponse::getName).containsExactly("projet-2", "projet-1");
    }

    @Test
    void summaryCitesAtMostFourProjectsPerRole() {
        when(openingRepository.findAllOpenWithProject()).thenReturn(IntStream.rangeClosed(1, 6)
                .mapToObj(id -> opening(project(id), TeamRole.DATA, 1))
                .toList());
        when(projectMapper.toBrief(any(Project.class))).thenReturn(new ProjectBriefResponse());

        OpeningRoleSummaryResponse data = openingService.summaryByRole().get(0);

        assertThat(data.getOpenings()).isEqualTo(6);
        assertThat(data.getProjects()).hasSize(ProjectOpeningService.PROJECTS_PER_ROLE);
    }

    @Test
    void stackSummaryAddsUpEachTechnologyAndRanksByOpeningsThenPopularity() {
        when(openingRepository.countOpenByStackAndProject()).thenReturn(List.of(
                new Object[] { "go", "Go", 2, 3L, 3L, 3L },
                new Object[] { "dart", "Dart", 4, 2L, 2L, 3L },
                new Object[] { "flutter", "Flutter", 6, 2L, 2L, 3L },
                new Object[] { "dart", "Dart", 4, 1L, 4L, 5L },
                new Object[] { "python", "Python", 5, 4L, 7L, 9L },
                new Object[] { "flutter", "Flutter", 6, 1L, 4L, 5L }));

        List<OpeningStackSummaryResponse> stacks = openingService.summaryByStack(10);

        // Python a le plus d'annonces ; Flutter et Dart en ont autant, Flutter est le plus utilisé
        assertThat(stacks).extracting(OpeningStackSummaryResponse::getSlug).containsExactly("python", "flutter", "dart", "go");
        OpeningStackSummaryResponse flutter = stacks.get(1);
        assertThat(flutter.getOpenings()).isEqualTo(6);
        assertThat(flutter.getSeats()).isEqualTo(8);
        assertThat(flutter.getProjects()).isEqualTo(2);
        assertThat(flutter.getProjectIds()).containsExactly(1L, 2L);
    }

    @Test
    void stackSummaryKeepsTheLimitBetweenOneAndTheMaximum() {
        when(openingRepository.countOpenByStackAndProject()).thenReturn(IntStream.rangeClosed(1, 40)
                .mapToObj(id -> new Object[] { "tag-" + id, "Tag " + id, 0, (long) id, 1L, 1L })
                .toList());

        assertThat(openingService.summaryByStack(0)).hasSize(1);
        assertThat(openingService.summaryByStack(500)).hasSize(ProjectOpeningService.MAX_STACKS);
    }

    @Test
    void managerPublishesAnOpeningAndTheProjectStartsRecruiting() {
        Project project = project(PROJECT_ID);
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.canManage(project, MANAGER)).thenReturn(true);
        when(openingRepository.save(any(ProjectOpening.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectMapper.toOpeningResponse(any(ProjectOpening.class))).thenReturn(new ProjectOpeningResponse());

        openingService.create(MANAGER, PROJECT_ID, request(TeamRole.MOBILE, null));

        ArgumentCaptor<ProjectOpening> saved = ArgumentCaptor.forClass(ProjectOpening.class);
        verify(openingRepository).save(saved.capture());
        assertThat(saved.getValue().getTitle()).isEqualTo("Dev mobile React Native");
        assertThat(saved.getValue().getSeats()).isEqualTo(1);
        assertThat(saved.getValue().isOpen()).isTrue();
        assertThat(project.isLookingForContributors()).isTrue();
    }

    @Test
    void someoneOutsideTheTeamCannotPublishAnOpening() {
        Project project = project(PROJECT_ID);
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.canManage(project, STRANGER)).thenReturn(false);
        when(userService.canModerate(STRANGER)).thenReturn(false);

        assertThatThrownBy(() -> openingService.create(STRANGER, PROJECT_ID, request(TeamRole.DESIGN, 1)))
                .isInstanceOf(ForbiddenException.class);
        verify(openingRepository, never()).save(any());
    }

    @Test
    void managerClosesAFilledOpening() {
        Project project = project(PROJECT_ID);
        ProjectOpening opening = opening(project, TeamRole.QA, 2);
        when(openingRepository.findById(5L)).thenReturn(Optional.of(opening));
        when(projectService.canManage(project, MANAGER)).thenReturn(true);
        when(openingRepository.saveAndFlush(opening)).thenReturn(opening);

        openingService.setOpen(MANAGER, 5L, false);

        assertThat(opening.isOpen()).isFalse();
    }
}
