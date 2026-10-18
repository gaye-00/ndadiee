package com.hautetech.ndadiee.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.hautetech.ndadiee.dto.response.CollaboratorResponse;
import com.hautetech.ndadiee.dto.response.ContributionDayResponse;
import com.hautetech.ndadiee.dto.response.MemberProjectResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

/** Le profil public : ses projets avec sa place dans l'équipe, ses coéquipiers, et ses contributions jour par jour. */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    private static final Long ADA = 1L;

    @Mock
    private UserService userService;
    @Mock
    private ProjectService projectService;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private DeveloperRepository developerRepository;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private ProfileService service;

    @BeforeEach
    void setUp() {
        when(userService.findDeveloperByUsernameOrThrow("ada")).thenReturn(developer(ADA, "ada"));
    }

    private static Developer developer(Long id, String username) {
        return Developer.builder().id(id).username(username).fullName(username).build();
    }

    // Une ligne de findTeammates : [coéquipier, id, nom, slug et étoiles du projet]
    private static Object[] teammate(Long member, Long project, int stars) {
        return new Object[] { member, project, "Projet " + project, "projet-" + project, stars };
    }

    @Test
    void collaboratorsWithTheMostSharedProjectsComeFirstThenTheMostStarred() {
        when(projectMemberRepository.findTeammates(ADA, MemberStatus.ACCEPTED)).thenReturn(List.of(
                teammate(3L, 10L, 5),
                teammate(2L, 10L, 5),
                teammate(2L, 11L, 40),
                teammate(4L, 11L, 40)));
        when(developerRepository.findAllById(List.of(2L, 4L, 3L)))
                .thenReturn(List.of(developer(3L, "kofi"), developer(2L, "awa"), developer(4L, "musa")));
        when(userMapper.toSummary(any(Developer.class)))
                .thenAnswer(call -> UserSummaryResponse.builder().id(call.<Developer>getArgument(0).getId()).build());

        List<CollaboratorResponse> collaborators = service.getCollaborators("ada");

        assertThat(collaborators).extracting(collaborator -> collaborator.getUser().getId()).containsExactly(2L, 4L, 3L);
        assertThat(collaborators.get(0).getSharedProjectCount()).isEqualTo(2);
        // Ses projets en commun : le plus étoilé d'abord
        assertThat(collaborators.get(0).getProjects()).extracting(ProjectBriefResponse::getSlug).containsExactly("projet-11", "projet-10");
    }

    @Test
    void contributionsAreCountedPerUtcDay() {
        when(developerRepository.findContributionDates(eq(ADA), any(Instant.class), eq(ArticleStatus.PUBLISHED))).thenReturn(List.of(
                Instant.parse("2026-10-17T23:30:00Z"),
                Instant.parse("2026-10-18T00:10:00Z"),
                Instant.parse("2026-10-18T09:00:00Z"),
                Instant.parse("2026-09-01T12:00:00Z")));

        List<ContributionDayResponse> days = service.getActivity("ada");

        assertThat(days).containsExactly(
                new ContributionDayResponse(LocalDate.parse("2026-09-01"), 1),
                new ContributionDayResponse(LocalDate.parse("2026-10-17"), 1),
                new ContributionDayResponse(LocalDate.parse("2026-10-18"), 2));
    }

    @Test
    void projectsKeepTheirPlaceInTheTeamAndHiddenOnesStayForTheirAuthor() {
        Project lead = Project.builder().id(10L).slug("kawral").build();
        Project joined = Project.builder().id(11L).slug("sunu-solar").build();
        List<ProjectMember> memberships = List.of(
                ProjectMember.builder().project(lead).role(ProjectRole.OWNER).build(),
                ProjectMember.builder().project(joined).role(ProjectRole.CONTRIBUTOR).specialty(TeamRole.MOBILE).build());
        when(userService.canSeeHidden(ADA, ADA)).thenReturn(true);
        when(projectMemberRepository.findTeamsOf(eq(ADA), eq(MemberStatus.ACCEPTED), eq(ProjectRole.OWNER), eq(true), any(Pageable.class)))
                .thenReturn(new PageImpl<>(memberships, PageRequest.of(0, 6), 2));
        when(projectService.toResponses(anyList(), eq(ADA))).thenReturn(List.of(
                ProjectResponse.builder().slug("kawral").build(),
                ProjectResponse.builder().slug("sunu-solar").build()));

        List<MemberProjectResponse> projects = service.getProjects("ada", ADA, PageRequest.of(0, 6)).getContent();

        assertThat(projects).extracting(project -> project.getProject().getSlug()).containsExactly("kawral", "sunu-solar");
        assertThat(projects).extracting(MemberProjectResponse::getRole).containsExactly(ProjectRole.OWNER, ProjectRole.CONTRIBUTOR);
        assertThat(projects.get(1).getSpecialty()).isEqualTo(TeamRole.MOBILE);
    }
}
