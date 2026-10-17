package com.hautetech.ndadiee.service.hackathon;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.HackathonRequest;
import com.hautetech.ndadiee.dto.request.HackathonResultRequest;
import com.hautetech.ndadiee.dto.request.HackathonTeamRequest;
import com.hautetech.ndadiee.dto.response.HackathonResponse;
import com.hautetech.ndadiee.dto.response.HackathonTeamResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.exception.ConflictException;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.HackathonMapper;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.hackathon.Hackathon;
import com.hautetech.ndadiee.model.hackathon.HackathonStatus;
import com.hautetech.ndadiee.model.hackathon.HackathonTeam;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.HackathonRepository;
import com.hautetech.ndadiee.repository.HackathonTeamRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.project.ProjectService;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Hackathons : le statut suit les dates ; une équipe s'inscrit avant la clôture, s'il reste de la place et
 * si elle n'est ni trop grande ni déjà prise ailleurs ; le palmarès vient après la fin.
 */
@ExtendWith(MockitoExtension.class)
class HackathonServiceTest {

    private static final Long MANAGER = 1L;
    private static final Long STRANGER = 2L;
    private static final Long MODERATOR = 3L;
    private static final Long HACKATHON_ID = 20L;
    private static final Long PROJECT_ID = 10L;

    @Mock
    private HackathonRepository hackathonRepository;
    @Mock
    private HackathonTeamRepository teamRepository;
    @Mock
    private ProjectMemberRepository memberRepository;
    @Mock
    private ProjectOpeningRepository openingRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;
    @Mock
    private TagService tagService;
    @Mock
    private SlugService slugService;
    @Mock
    private HackathonMapper hackathonMapper;
    @Mock
    private ProjectMapper projectMapper;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private HackathonService hackathonService;

    private Project project;

    @BeforeEach
    void setUp() {
        project = project(PROJECT_ID);
        lenient().when(userService.canModerate(MODERATOR)).thenReturn(true);
        lenient().when(hackathonMapper.toResponse(any(Hackathon.class))).thenAnswer(invocation -> new HackathonResponse());
        lenient().when(hackathonMapper.toTeamResponse(any(HackathonTeam.class))).thenAnswer(invocation -> {
            HackathonTeam team = invocation.getArgument(0);
            return HackathonTeamResponse.builder()
                    .project(ProjectBriefResponse.builder().id(team.getProject().getId()).build())
                    .build();
        });
    }

    // ==================== DONNÉES ====================

    private static Project project(long id) {
        return Project.builder().id(id).name("projet-" + id).slug("projet-" + id).build();
    }

    /** Un hackathon qui commence dans {@code startsIn}, dure 48 heures, et ferme ses inscriptions 3 jours avant. */
    private static Hackathon hackathon(Duration startsIn) {
        Instant startsAt = Instant.now().plus(startsIn);
        return Hackathon.builder()
                .id(HACKATHON_ID)
                .title("AgriTech 48h")
                .slug("agritech-48h")
                .startsAt(startsAt)
                .endsAt(startsAt.plus(Duration.ofHours(48)))
                .registrationClosesAt(startsAt.minus(Duration.ofDays(3)))
                .minTeamSize(2)
                .maxTeamSize(5)
                .build();
    }

    private static HackathonTeam team(long id, Hackathon hackathon, Project project) {
        return HackathonTeam.builder().id(id).hackathon(hackathon).project(project).build();
    }

    private static ProjectOpening opening(Project project, TeamRole role, int seats) {
        return ProjectOpening.builder().project(project).role(role).title(role.name()).seats(seats).build();
    }

    private static HackathonTeamRequest registration() {
        return HackathonTeamRequest.builder().projectId(PROJECT_ID).pitch("  Le prix du cacao en direct  ").build();
    }

    private static HackathonRequest request(Instant startsAt, Instant endsAt, Instant closesAt) {
        return HackathonRequest.builder()
                .title("AgriTech 48h")
                .description("Du champ au marché.")
                .organizerName("Abidjan AgriTech Lab")
                .format(WorkMode.ONSITE)
                .country("ci")
                .city("Abidjan")
                .timezone("Africa/Abidjan")
                .startsAt(startsAt)
                .endsAt(endsAt)
                .registrationClosesAt(closesAt)
                .minTeamSize(2)
                .maxTeamSize(5)
                .build();
    }

    /** Une inscription qui passe tous les contrôles, jusqu'à la vérification visée par le test. */
    private Hackathon openForRegistration() {
        Hackathon hackathon = hackathon(Duration.ofDays(30));
        when(hackathonRepository.findById(HACKATHON_ID)).thenReturn(Optional.of(hackathon));
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.canManage(project, MANAGER)).thenReturn(true);
        return hackathon;
    }

    // ==================== STATUT ====================

    @Test
    void statusFollowsTheDates() {
        Instant now = Instant.now();

        assertThat(HackathonStatus.of(hackathon(Duration.ofDays(2)), now)).isEqualTo(HackathonStatus.UPCOMING);
        assertThat(HackathonStatus.of(hackathon(Duration.ofHours(-1)), now)).isEqualTo(HackathonStatus.ONGOING);
        assertThat(HackathonStatus.of(hackathon(Duration.ofDays(-3)), now)).isEqualTo(HackathonStatus.ENDED);
    }

    // ==================== LISTE ====================

    @Test
    void responsesAddUpTheSeatsTeamsSeekAndListTheirRolesInCatalogOrder() {
        Hackathon hackathon = hackathon(Duration.ofDays(30));
        Project kumasi = project(1);
        Project agri = project(2);
        when(teamRepository.findWithProjectByHackathonIds(List.of(HACKATHON_ID)))
                .thenReturn(List.of(team(1, hackathon, kumasi), team(2, hackathon, agri)));
        when(memberRepository.countByProjectIdsAndStatus(List.of(1L, 2L), MemberStatus.ACCEPTED))
                .thenReturn(List.of(new Object[] { 1L, 3L }, new Object[] { 2L, 2L }));
        when(openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(List.of(1L, 2L))).thenReturn(List.of(
                opening(kumasi, TeamRole.DESIGN, 1),
                opening(agri, TeamRole.DATA, 2),
                opening(kumasi, TeamRole.FRONTEND, 1),
                opening(agri, TeamRole.FRONTEND, 1)));
        when(memberRepository.findByUserIdAndProjectIdIn(MANAGER, List.of(1L, 2L))).thenReturn(List.of(
                ProjectMember.builder().project(kumasi).status(MemberStatus.ACCEPTED).build()));
        when(hackathonRepository.findBySlug("agritech-48h")).thenReturn(Optional.of(hackathon));

        HackathonResponse response = hackathonService.getBySlug("agritech-48h", MANAGER);

        assertThat(response.getStatus()).isEqualTo(HackathonStatus.UPCOMING);
        assertThat(response.isRegistrationOpen()).isTrue();
        assertThat(response.getTeamCount()).isEqualTo(2);
        assertThat(response.getOpenSeats()).isEqualTo(5);
        // FRONTEND vient avant DESIGN et DATA dans le catalogue, et n'est cité qu'une fois
        assertThat(response.getRolesSought()).containsExactly(TeamRole.FRONTEND, TeamRole.DESIGN, TeamRole.DATA);
        assertThat(response.getTeams()).extracting(HackathonTeamResponse::getMemberCount).containsExactly(3L, 2L);
        // L'équipe du membre connecté, avec ses rôles ouverts
        assertThat(response.getMyTeam().getProject().getId()).isEqualTo(1L);
        assertThat(response.getMyTeam().getOpenings()).hasSize(2);
    }

    @Test
    void aFullHackathonIsNoLongerOpenForRegistration() {
        Hackathon hackathon = hackathon(Duration.ofDays(30));
        hackathon.setMaxTeams(2);
        when(teamRepository.findWithProjectByHackathonIds(List.of(HACKATHON_ID)))
                .thenReturn(List.of(team(1, hackathon, project(1)), team(2, hackathon, project(2))));
        when(hackathonRepository.findBySlug("agritech-48h")).thenReturn(Optional.of(hackathon));

        HackathonResponse response = hackathonService.getBySlug("agritech-48h", null);

        assertThat(response.isRegistrationOpen()).isFalse();
        assertThat(response.getMyTeam()).isNull();
    }

    @Test
    void teamsStopRecruitingForTheHackathonAtTheKickoff() {
        Hackathon started = hackathon(Duration.ofHours(-2));
        Project kumasi = project(1);
        when(hackathonRepository.findById(HACKATHON_ID)).thenReturn(Optional.of(started));
        when(teamRepository.findWithProjectByHackathonIds(List.of(HACKATHON_ID))).thenReturn(List.of(team(1, started, kumasi)));
        when(openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(List.of(1L)))
                .thenReturn(List.of(opening(kumasi, TeamRole.FRONTEND, 1)));

        List<HackathonTeamResponse> teams = hackathonService.getTeams(HACKATHON_ID);

        // Le projet recrute toujours, mais plus pour ce hackathon
        assertThat(teams).singleElement().satisfies(team -> assertThat(team.getOpenings()).isEmpty());
    }

    // ==================== INSCRIPTION ====================

    @Test
    void aManagerRegistersAnIncompleteTeamWithItsPitch() {
        Hackathon hackathon = openForRegistration();
        when(memberRepository.countByProjectIdAndStatus(PROJECT_ID, MemberStatus.ACCEPTED)).thenReturn(1L);
        when(userService.getDeveloperOrThrow(MANAGER)).thenReturn(Developer.builder().id(MANAGER).build());
        when(teamRepository.save(any(HackathonTeam.class))).thenAnswer(invocation -> invocation.getArgument(0));

        hackathonService.register(MANAGER, HACKATHON_ID, registration());

        ArgumentCaptor<HackathonTeam> saved = ArgumentCaptor.forClass(HackathonTeam.class);
        verify(teamRepository).save(saved.capture());
        assertThat(saved.getValue().getProject()).isSameAs(project);
        assertThat(saved.getValue().getPitch()).isEqualTo("Le prix du cacao en direct");
        assertThat(hackathon.getTeams()).containsExactly(saved.getValue());
    }

    @Test
    void onlyTheProjectOwnerAndMaintainersRegisterItsTeam() {
        when(hackathonRepository.findById(HACKATHON_ID)).thenReturn(Optional.of(hackathon(Duration.ofDays(30))));
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.canManage(project, STRANGER)).thenReturn(false);

        assertThatThrownBy(() -> hackathonService.register(STRANGER, HACKATHON_ID, registration()))
                .isInstanceOf(ForbiddenException.class);
        verify(teamRepository, never()).save(any());
    }

    @Test
    void registrationsCloseBeforeTheKickoff() {
        // Commence dans deux jours : les inscriptions ont fermé hier
        when(hackathonRepository.findById(HACKATHON_ID)).thenReturn(Optional.of(hackathon(Duration.ofDays(2))));
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.canManage(project, MANAGER)).thenReturn(true);

        assertThatThrownBy(() -> hackathonService.register(MANAGER, HACKATHON_ID, registration()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("closes");
    }

    @Test
    void aProjectRegistersOnlyOnce() {
        openForRegistration();
        when(teamRepository.existsByHackathonIdAndProjectId(HACKATHON_ID, PROJECT_ID)).thenReturn(true);

        assertThatThrownBy(() -> hackathonService.register(MANAGER, HACKATHON_ID, registration()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aFullHackathonTakesNoMoreTeams() {
        openForRegistration().setMaxTeams(24);
        when(teamRepository.countByHackathonId(HACKATHON_ID)).thenReturn(24L);

        assertThatThrownBy(() -> hackathonService.register(MANAGER, HACKATHON_ID, registration()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("complet");
    }

    @Test
    void aTeamLargerThanAllowedCannotRegister() {
        openForRegistration();
        when(memberRepository.countByProjectIdAndStatus(PROJECT_ID, MemberStatus.ACCEPTED)).thenReturn(6L);

        assertThatThrownBy(() -> hackathonService.register(MANAGER, HACKATHON_ID, registration()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("6 membres");
    }

    @Test
    void aProjectCannotTakePartInTwoHackathonsAtTheSameTime() {
        Hackathon hackathon = openForRegistration();
        when(memberRepository.countByProjectIdAndStatus(PROJECT_ID, MemberStatus.ACCEPTED)).thenReturn(3L);
        when(teamRepository.existsOverlapping(PROJECT_ID, hackathon.getStartsAt(), hackathon.getEndsAt())).thenReturn(true);

        assertThatThrownBy(() -> hackathonService.register(MANAGER, HACKATHON_ID, registration()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("mêmes dates");
    }

    @Test
    void aTeamCannotWithdrawOnceTheHackathonHasStarted() {
        Hackathon started = hackathon(Duration.ofHours(-2));
        when(teamRepository.findByHackathonIdAndProjectId(HACKATHON_ID, PROJECT_ID))
                .thenReturn(Optional.of(team(1, started, project)));
        when(projectService.canManage(project, MANAGER)).thenReturn(true);

        assertThatThrownBy(() -> hackathonService.withdraw(MANAGER, HACKATHON_ID, PROJECT_ID))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(teamRepository, never()).delete(any());
    }

    // ==================== PALMARÈS ====================

    @Test
    void resultsArePublishedOnlyOnceTheHackathonIsOver() {
        when(teamRepository.findByHackathonIdAndProjectId(HACKATHON_ID, PROJECT_ID))
                .thenReturn(Optional.of(team(1, hackathon(Duration.ofHours(-2)), project)));

        assertThatThrownBy(() -> hackathonService.setResult(MODERATOR, HACKATHON_ID, PROJECT_ID,
                HackathonResultRequest.builder().rank(1).build()))
                .isInstanceOf(OperationNotAllowedException.class);
    }

    @Test
    void aPlaceGoesToOneTeamOnly() {
        Hackathon ended = hackathon(Duration.ofDays(-5));
        when(teamRepository.findByHackathonIdAndProjectId(HACKATHON_ID, PROJECT_ID))
                .thenReturn(Optional.of(team(1, ended, project)));
        when(teamRepository.findByHackathonIdAndRank(HACKATHON_ID, 1)).thenReturn(Optional.of(team(2, ended, project(11))));

        assertThatThrownBy(() -> hackathonService.setResult(MODERATOR, HACKATHON_ID, PROJECT_ID,
                HackathonResultRequest.builder().rank(1).build()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("projet-11");
    }

    @Test
    void onlyModeratorsPublishResults() {
        assertThatThrownBy(() -> hackathonService.setResult(STRANGER, HACKATHON_ID, PROJECT_ID,
                HackathonResultRequest.builder().rank(1).build()))
                .isInstanceOf(ForbiddenException.class);
    }

    // ==================== ORGANISATION ====================

    @Test
    void theSlugMeIsReservedForTheMemberRoute() {
        Instant startsAt = Instant.now().plus(Duration.ofDays(30));
        when(slugService.generateUniqueSlug(eq("AgriTech 48h"), any())).thenAnswer(invocation -> {
            Predicate<String> taken = invocation.getArgument(1);
            assertThat(taken.test("me")).isTrue();
            return "agritech-48h";
        });
        when(hackathonRepository.save(any(Hackathon.class))).thenAnswer(invocation -> invocation.getArgument(0));

        hackathonService.create(MODERATOR, request(startsAt, startsAt.plus(Duration.ofHours(48)), startsAt));

        ArgumentCaptor<Hackathon> saved = ArgumentCaptor.forClass(Hackathon.class);
        verify(hackathonRepository).save(saved.capture());
        assertThat(saved.getValue().getCountry()).isEqualTo("CI");
        assertThat(saved.getValue().getTimezone()).isEqualTo("Africa/Abidjan");
    }

    @Test
    void registrationsCannotCloseAfterTheKickoff() {
        Instant startsAt = Instant.now().plus(Duration.ofDays(30));

        assertThatThrownBy(() -> hackathonService.create(MODERATOR,
                request(startsAt, startsAt.plus(Duration.ofHours(48)), startsAt.plus(Duration.ofHours(1)))))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("coup d'envoi");
    }

    @Test
    void anUnknownTimezoneIsRefused() {
        Instant startsAt = Instant.now().plus(Duration.ofDays(30));
        HackathonRequest request = request(startsAt, startsAt.plus(Duration.ofHours(48)), startsAt);
        request.setTimezone("Africa/Atlantis");

        assertThatThrownBy(() -> hackathonService.create(MODERATOR, request))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("Fuseau");
        verify(hackathonRepository, never()).save(any());
    }

    @Test
    void anOnsiteHackathonGivesItsCity() {
        Instant startsAt = Instant.now().plus(Duration.ofDays(30));
        HackathonRequest request = request(startsAt, startsAt.plus(Duration.ofHours(48)), startsAt);
        request.setCity("  ");

        assertThatThrownBy(() -> hackathonService.create(MODERATOR, request))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("ville");
    }

    @Test
    void onlyModeratorsPublishHackathons() {
        Instant startsAt = Instant.now().plus(Duration.ofDays(30));

        assertThatThrownBy(() -> hackathonService.create(STRANGER,
                request(startsAt, startsAt.plus(Duration.ofHours(48)), startsAt)))
                .isInstanceOf(ForbiddenException.class);
        verify(hackathonRepository, never()).save(any());
        verify(teamRepository, never()).findWithProjectByHackathonIds(anyCollection());
        verify(memberRepository, never()).countByProjectIdAndStatus(anyLong(), any());
    }
}
