package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse.CountryFacet;
import com.hautetech.ndadiee.dto.response.OpeningFacetsResponse.RoleFacet;
import com.hautetech.ndadiee.dto.response.OpeningRoleSummaryResponse;
import com.hautetech.ndadiee.dto.response.OpeningStackSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.TagMapper;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.specification.OpeningFilter;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Annonces : la liste, ses ordres calculés (compatibilité, candidatures) et ses facettes ; seuls le porteur
 * et ses mainteneurs les gèrent ; l'accueil les résume par rôle et par technologie.
 */
@ExtendWith(MockitoExtension.class)
class ProjectOpeningServiceTest {

    private static final Long MANAGER = 1L;
    private static final Long STRANGER = 2L;
    private static final Long VIEWER = 3L;
    private static final Long PROJECT_ID = 10L;
    private static final OpeningFilter NO_FILTER = new OpeningFilter(null, null, null, null);

    @Mock
    private ProjectOpeningRepository openingRepository;

    @Mock
    private ProjectMemberRepository memberRepository;

    @Mock
    private DeveloperRepository developerRepository;

    @Mock
    private ProjectService projectService;

    @Mock
    private UserService userService;

    // Le vrai calcul : les ordres de la liste en dépendent
    @Spy
    private OpeningMatcher openingMatcher = new OpeningMatcher();

    @Mock
    private ProjectMapper projectMapper;

    @Mock
    private TagMapper tagMapper;

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

    // Des tags distincts : deux entités sans identifiant seraient égales
    private static Set<Tag> tags(String... names) {
        return Arrays.stream(names)
                .map(name -> Tag.builder().id((long) name.hashCode()).name(name).slug(name.toLowerCase()).build())
                .collect(Collectors.toSet());
    }

    private static Project project(long id, String... stack) {
        return Project.builder().id(id).name("projet-" + id).slug("projet-" + id).tags(tags(stack)).build();
    }

    private static ProjectOpening opening(long id, Project project, TeamRole role) {
        return ProjectOpening.builder().id(id).project(project).role(role).title(role.name()).seats(1).build();
    }

    private static ProjectMember membership(Project project, MemberStatus status, ProjectOpening opening) {
        return ProjectMember.builder().project(project).status(status).opening(opening).build();
    }

    // Les réponses gardent l'identifiant de l'annonce ; le projet résumé est vide, ses technologies aussi
    private void mapResponses() {
        when(projectMapper.toBrief(any(Project.class))).thenAnswer(invocation -> new ProjectBriefResponse());
        when(projectMapper.toOpeningResponse(any(ProjectOpening.class))).thenAnswer(invocation -> {
            ProjectOpening opening = invocation.getArgument(0);
            return ProjectOpeningResponse.builder().id(opening.getId()).role(opening.getRole()).build();
        });
        when(tagMapper.toResponses(anyCollection())).thenReturn(List.of());
    }

    // Toutes les annonces des filtres, les plus récentes d'abord (ordres calculés)
    private void newestFirst(ProjectOpening... openings) {
        when(openingRepository.findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), any(Sort.class)))
                .thenReturn(List.of(openings));
    }

    private void skills(String... names) {
        when(developerRepository.findById(VIEWER)).thenReturn(Optional.of(Developer.builder().id(VIEWER).skills(tags(names)).build()));
    }

    private static List<Long> idsOf(PageResponse<ProjectOpeningResponse> page) {
        return page.getContent().stream().map(ProjectOpeningResponse::getId).toList();
    }

    @Test
    void listByMatchPutsTheRolesClosestToTheProfileFirstAndKeepsTheNewestFirstOtherwise() {
        Project transit = project(1, "Python");
        Project kawral = project(2, "Flutter", "Dart");
        // Les plus récentes d'abord : data (aucune compétence ne compte), puis deux rôles mobile Flutter
        newestFirst(opening(30, transit, TeamRole.DATA), opening(20, kawral, TeamRole.MOBILE), opening(10, kawral, TeamRole.MOBILE));
        when(memberRepository.countByOpeningIdsAndStatus(anyCollection(), eq(MemberStatus.PENDING))).thenReturn(List.of());
        when(memberRepository.findByUserIdAndProjectIdIn(eq(VIEWER), anyCollection())).thenReturn(List.of());
        skills("Flutter", "Dart");
        mapResponses();

        PageResponse<ProjectOpeningResponse> first = openingService.list(NO_FILTER, VIEWER,
                PageRequest.of(0, 2, Sort.by(ProjectOpeningService.BY_MATCH)));

        // Les deux rôles mobile ont le même score : le plus récent d'abord
        assertThat(idsOf(first)).containsExactly(20L, 10L);
        assertThat(first.getTotalElements()).isEqualTo(3);
        assertThat(first.isLast()).isFalse();
        assertThat(first.getContent().get(0).getMatch().getScore()).isGreaterThan(70);
        assertThat(first.getContent().get(0).getMatch().getSkills()).containsExactly("Dart", "Flutter");

        PageResponse<ProjectOpeningResponse> second = openingService.list(NO_FILTER, VIEWER,
                PageRequest.of(1, 2, Sort.by(ProjectOpeningService.BY_MATCH)));
        assertThat(idsOf(second)).containsExactly(30L);
        assertThat(second.getContent().get(0).getMatch()).isNull();
    }

    @Test
    void listTellsTheMemberWhereTheyAppliedAndLeavesTheirOwnTeamOutOfTheMatch() {
        Project mine = project(1, "Flutter");
        Project other = project(2, "Flutter");
        ProjectOpening inMyTeam = opening(10, mine, TeamRole.MOBILE);
        ProjectOpening appliedTo = opening(20, other, TeamRole.MOBILE);
        ProjectOpening sameProject = opening(30, other, TeamRole.DESIGN);
        Page<ProjectOpening> page = new PageImpl<>(List.of(inMyTeam, appliedTo, sameProject));
        when(openingRepository.findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), any(Pageable.class))).thenReturn(page);
        when(memberRepository.countByOpeningIdsAndStatus(anyCollection(), eq(MemberStatus.PENDING)))
                .thenReturn(List.<Object[]>of(new Object[] { 20L, 2L }));
        when(memberRepository.findByUserIdAndProjectIdIn(eq(VIEWER), anyCollection())).thenReturn(List.of(
                membership(mine, MemberStatus.ACCEPTED, null),
                membership(other, MemberStatus.PENDING, appliedTo)));
        skills("Flutter");
        mapResponses();

        List<ProjectOpeningResponse> openings = openingService.list(NO_FILTER, VIEWER,
                PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();

        ProjectOpeningResponse team = openings.get(0);
        assertThat(team.getMatch()).isNull();
        assertThat(team.getAppliedByMe()).isFalse();
        assertThat(team.getProject().getMyMembershipStatus()).isEqualTo(MemberStatus.ACCEPTED);

        ProjectOpeningResponse applied = openings.get(1);
        assertThat(applied.getAppliedByMe()).isTrue();
        assertThat(applied.getApplicants()).isEqualTo(2);
        assertThat(applied.getMatch()).isNotNull();
        assertThat(applied.getProject().getMyMembershipStatus()).isEqualTo(MemberStatus.PENDING);

        // Même projet, autre rôle : la candidature en attente vise l'autre annonce
        ProjectOpeningResponse design = openings.get(2);
        assertThat(design.getAppliedByMe()).isFalse();
        assertThat(design.getApplicants()).isZero();
    }

    @Test
    void listByApplicantsPutsTheLeastContestedOpeningsFirst() {
        Project project = project(1, "Go");
        newestFirst(opening(30, project, TeamRole.BACKEND), opening(20, project, TeamRole.DATA), opening(10, project, TeamRole.QA));
        when(memberRepository.countByOpeningIdsAndStatus(anyCollection(), eq(MemberStatus.PENDING)))
                .thenReturn(List.<Object[]>of(new Object[] { 30L, 2L }, new Object[] { 10L, 1L }));
        mapResponses();

        PageResponse<ProjectOpeningResponse> page = openingService.list(NO_FILTER, null,
                PageRequest.of(0, 12, Sort.by(Sort.Direction.ASC, ProjectOpeningService.BY_APPLICANTS)));

        assertThat(idsOf(page)).containsExactly(20L, 10L, 30L);
        assertThat(page.getContent()).extracting(ProjectOpeningResponse::getApplicants).containsExactly(0L, 1L, 2L);
        // Un visiteur : ni compatibilité ni candidature
        assertThat(page.getContent()).allSatisfy(opening -> {
            assertThat(opening.getMatch()).isNull();
            assertThat(opening.getAppliedByMe()).isNull();
        });
    }

    @Test
    void aVisitorAskingForTheClosestRolesGetsTheNewestFirst() {
        when(openingRepository.findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        openingService.list(NO_FILTER, null, PageRequest.of(2, 12, Sort.by(ProjectOpeningService.BY_MATCH)));

        ArgumentCaptor<Pageable> asked = ArgumentCaptor.forClass(Pageable.class);
        verify(openingRepository).findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), asked.capture());
        assertThat(asked.getValue().getPageNumber()).isEqualTo(2);
        assertThat(asked.getValue().getSort())
                .containsExactly(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    }

    @Test
    void theRequestedOrderIsBrokenByTheNewestIdentifier() {
        when(openingRepository.findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        openingService.list(NO_FILTER, null, PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "seats")));

        ArgumentCaptor<Pageable> asked = ArgumentCaptor.forClass(Pageable.class);
        verify(openingRepository).findAll(ArgumentMatchers.<Specification<ProjectOpening>>any(), asked.capture());
        assertThat(asked.getValue().getSort()).containsExactly(Sort.Order.desc("seats"), Sort.Order.desc("id"));
    }

    @Test
    void facetsListRolesInCatalogOrderAndCountriesByOpenings() {
        when(openingRepository.countByRole(any())).thenReturn(List.of(
                new Object[] { TeamRole.DESIGN, 2L, 2L },
                new Object[] { TeamRole.MOBILE, 3L, 4L }));
        when(openingRepository.countByTag(any())).thenReturn(List.<Object[]>of(new Object[] { "flutter", "Flutter", 3L }));
        when(openingRepository.countByOwnerCountry(any())).thenReturn(List.of(
                new Object[] { "SN", 3L },
                new Object[] { "NG", 5L },
                new Object[] { "KE", 3L }));
        // Toutes les annonces des filtres, puis toutes les annonces sans le filtre de rôle
        when(openingRepository.count(ArgumentMatchers.<Specification<ProjectOpening>>any())).thenReturn(5L, 9L);
        when(openingRepository.sumSeats(any())).thenReturn(7L);
        when(openingRepository.countProjects(any())).thenReturn(3L);
        when(openingRepository.countWithoutApplicants(any())).thenReturn(4L);

        OpeningFacetsResponse facets = openingService.facets(new OpeningFilter(TeamRole.MOBILE, null, null, "sn"));

        assertThat(facets.getRoles()).extracting(RoleFacet::role).containsExactly(TeamRole.MOBILE, TeamRole.DESIGN);
        assertThat(facets.getRoles().get(0).seats()).isEqualTo(4);
        assertThat(facets.getCountries()).extracting(CountryFacet::country).containsExactly("NG", "KE", "SN");
        assertThat(facets.getStacks()).hasSize(1);
        assertThat(facets.getTotal()).isEqualTo(5);
        assertThat(facets.getAll()).isEqualTo(9);
        assertThat(facets.getSeats()).isEqualTo(7);
        assertThat(facets.getProjects()).isEqualTo(3);
        assertThat(facets.getUnclaimed()).isEqualTo(4);
    }

    @Test
    void filterKeepsCountryCodesInUpperCase() {
        assertThat(new OpeningFilter(null, null, null, " sn ").country()).isEqualTo("SN");
        assertThat(new OpeningFilter(TeamRole.QA, "q", "go", "ng").withoutRole())
                .isEqualTo(new OpeningFilter(null, "q", "go", "NG"));
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
