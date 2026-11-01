package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.dto.request.JoinProjectRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectSettingsRequest;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.event.ProjectJoinRequestedEvent;
import com.hautetech.ndadiee.event.ProjectMemberLeftEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.HackathonMapper;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
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
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.media.MediaUploadService;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Candidatures : on postule à un rôle ouvert du projet ; le rôle se ferme quand ses places sont prises. Images : le
 * projet garde celles qu'il montre, et rend celles qu'il ne montre plus.
 */
@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final Long OWNER = 1L;
    private static final Long CANDIDATE = 2L;
    private static final Long PROJECT_ID = 10L;
    private static final Long OPENING_ID = 40L;

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private ProjectOpeningRepository projectOpeningRepository;
    @Mock
    private ProjectMediaRepository mediaRepository;
    @Mock
    private ProjectGithubActivityRepository githubActivityRepository;
    @Mock
    private DeveloperRepository developerRepository;
    @Mock
    private VoteRepository voteRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private UserService userService;
    @Mock
    private TagService tagService;
    @Mock
    private SlugService slugService;
    @Mock
    private VoteService voteService;
    @Mock
    private OpeningMatcher openingMatcher;
    @Mock
    private ProjectMapper projectMapper;
    @Mock
    private UserMapper userMapper;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private HackathonTeamRepository hackathonTeamRepository;
    @Mock
    private HackathonMapper hackathonMapper;
    @Mock
    private MediaUploadService mediaUploadService;

    @InjectMocks
    private ProjectService projectService;

    private Project project;
    private Developer candidate;

    private static Developer developer(Long id) {
        Developer developer = Developer.builder().username("dev-" + id).build();
        developer.setId(id);
        return developer;
    }

    private ProjectOpening opening(Project owner, int seats, boolean open) {
        return ProjectOpening.builder().id(OPENING_ID).project(owner).role(TeamRole.DESIGN).title("Designer UI")
                .seats(seats).open(open).build();
    }

    @BeforeEach
    void setUp() {
        project = Project.builder().id(PROJECT_ID).name("lagos-transit").slug("lagos-transit").owner(developer(OWNER))
                .lookingForContributors(true).build();
        candidate = developer(CANDIDATE);
    }

    private void candidateApplies() {
        when(userService.getDeveloperOrThrow(CANDIDATE)).thenReturn(candidate);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, CANDIDATE)).thenReturn(Optional.empty());
    }

    @Test
    void applyingToAnOpenRoleKeepsTheRoleAsSpecialtyAndTheMotivation() {
        ProjectOpening design = opening(project, 1, true);
        candidateApplies();
        when(projectOpeningRepository.findById(OPENING_ID)).thenReturn(Optional.of(design));
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.join(CANDIDATE, PROJECT_ID,
                JoinProjectRequest.builder().openingId(OPENING_ID).motivation("  Je commence par la page arrêt  ").build());

        ArgumentCaptor<ProjectMember> saved = ArgumentCaptor.forClass(ProjectMember.class);
        verify(projectMemberRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(MemberStatus.PENDING);
        assertThat(saved.getValue().getOpening()).isSameAs(design);
        assertThat(saved.getValue().getSpecialty()).isEqualTo(TeamRole.DESIGN);
        assertThat(saved.getValue().getMotivation()).isEqualTo("Je commence par la page arrêt");
        verify(eventPublisher).publishEvent(any(ProjectJoinRequestedEvent.class));
    }

    @Test
    void aFilledRoleTakesNoMoreApplications() {
        candidateApplies();
        when(projectOpeningRepository.findById(OPENING_ID)).thenReturn(Optional.of(opening(project, 1, false)));

        assertThatThrownBy(() -> projectService.join(CANDIDATE, PROJECT_ID,
                JoinProjectRequest.builder().openingId(OPENING_ID).build()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(projectMemberRepository, never()).save(any(ProjectMember.class));
    }

    @Test
    void aRoleOfAnotherProjectIsNotFound() {
        Project other = Project.builder().id(99L).owner(developer(OWNER)).build();
        candidateApplies();
        when(projectOpeningRepository.findById(OPENING_ID)).thenReturn(Optional.of(opening(other, 1, true)));

        assertThatThrownBy(() -> projectService.join(CANDIDATE, PROJECT_ID,
                JoinProjectRequest.builder().openingId(OPENING_ID).build()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(projectMemberRepository, never()).save(any(ProjectMember.class));
    }

    private ProjectMember pendingFor(ProjectOpening opening) {
        ProjectMember member = ProjectMember.builder().id(7L).project(project).user(candidate).opening(opening)
                .specialty(opening.getRole()).role(ProjectRole.CONTRIBUTOR).status(MemberStatus.PENDING).build();
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(projectMemberRepository.save(member)).thenReturn(member);
        return member;
    }

    @Test
    void acceptingTheLastSeatOfARoleClosesIt() {
        ProjectOpening design = opening(project, 1, true);
        ProjectMember member = pendingFor(design);
        when(projectMemberRepository.countByOpeningIdAndStatus(OPENING_ID, MemberStatus.ACCEPTED)).thenReturn(1L);

        projectService.decide(OWNER, PROJECT_ID, 7L, MemberDecisionRequest.builder().status(MemberStatus.ACCEPTED).build());

        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACCEPTED);
        assertThat(member.getSpecialty()).isEqualTo(TeamRole.DESIGN);
        assertThat(design.isOpen()).isFalse();
    }

    @Test
    void aRoleWithSeatsLeftStaysOpen() {
        ProjectOpening reviewers = opening(project, 3, true);
        pendingFor(reviewers);
        when(projectMemberRepository.countByOpeningIdAndStatus(OPENING_ID, MemberStatus.ACCEPTED)).thenReturn(2L);

        projectService.decide(OWNER, PROJECT_ID, 7L, MemberDecisionRequest.builder().status(MemberStatus.ACCEPTED).build());

        assertThat(reviewers.isOpen()).isTrue();
    }

    @Test
    void aRefusalLeavesTheRoleOpen() {
        ProjectOpening design = opening(project, 1, true);
        pendingFor(design);

        projectService.decide(OWNER, PROJECT_ID, 7L, MemberDecisionRequest.builder().status(MemberStatus.REJECTED).build());

        assertThat(design.isOpen()).isTrue();
        verify(projectMemberRepository, never()).countByOpeningIdAndStatus(any(), any());
    }

    @Test
    void replacingTheCoverReleasesTheOldOneAndKeepsTheNewOne() {
        project.setCoverUrl("https://media.example.com/old.webp");
        project.setCoverThumbnailUrl("https://media.example.com/old-640.webp");
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(project)).thenReturn(project);
        when(projectMapper.toResponse(project)).thenReturn(ProjectResponse.builder().id(PROJECT_ID).build());

        projectService.update(OWNER, PROJECT_ID, ProjectRequest.builder().name("Lagos Transit").description("Les bus de Lagos.")
                .coverUrl("https://media.example.com/new.webp").coverThumbnailUrl("https://media.example.com/old-640.webp").build());

        verify(mediaUploadService).release(PROJECT_ID, Set.of("https://media.example.com/old.webp"));
        verify(mediaUploadService).attach(PROJECT_ID, Set.of("https://media.example.com/new.webp", "https://media.example.com/old-640.webp"));
    }

    @Test
    void aNewProjectKeepsItsCover() {
        when(userService.getDeveloperOrThrow(OWNER)).thenReturn(project.getOwner());
        when(slugService.generateUniqueSlug(any(), any())).thenReturn("paperweight");
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            saved.setId(PROJECT_ID);
            return saved;
        });
        when(projectMapper.toResponse(any(Project.class))).thenReturn(ProjectResponse.builder().id(PROJECT_ID).build());

        projectService.create(OWNER, ProjectRequest.builder().name("Paperweight").description("Notes hors ligne.")
                .coverUrl("https://media.example.com/cover.webp").build());

        verify(mediaUploadService).attach(PROJECT_ID, Set.of("https://media.example.com/cover.webp"));
        verify(hackathonTeamRepository).findCurrentByProjectIds(eq(List.of(PROJECT_ID)), any());
    }

    // ==================== DÉPARTS DE L'ÉQUIPE ====================

    private ProjectMember teammate(Long memberId, Long userId, ProjectRole role) {
        return ProjectMember.builder().id(memberId).project(project).user(developer(userId)).role(role)
                .status(MemberStatus.ACCEPTED).build();
    }

    @Test
    void theOwnerRemovesATeammateWhoseTasksAreReleased() {
        ProjectMember member = teammate(70L, CANDIDATE, ProjectRole.CONTRIBUTOR);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findById(70L)).thenReturn(Optional.of(member));

        projectService.removeMember(OWNER, PROJECT_ID, 70L);

        verify(projectMemberRepository).delete(member);
        verify(eventPublisher).publishEvent(new ProjectMemberLeftEvent(PROJECT_ID, CANDIDATE));
    }

    @Test
    void theOwnerIsNeverRemoved() {
        ProjectMember owner = teammate(71L, OWNER, ProjectRole.OWNER);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findById(71L)).thenReturn(Optional.of(owner));
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, 5L))
                .thenReturn(Optional.of(teammate(72L, 5L, ProjectRole.MAINTAINER)));

        assertThatThrownBy(() -> projectService.removeMember(5L, PROJECT_ID, 71L)).isInstanceOf(OperationNotAllowedException.class);
        verify(projectMemberRepository, never()).delete(any(ProjectMember.class));
    }

    @Test
    void aContributorRemovesNobody() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, CANDIDATE))
                .thenReturn(Optional.of(teammate(70L, CANDIDATE, ProjectRole.CONTRIBUTOR)));

        assertThatThrownBy(() -> projectService.removeMember(CANDIDATE, PROJECT_ID, 73L)).isInstanceOf(ForbiddenException.class);
        verify(projectMemberRepository, never()).delete(any(ProjectMember.class));
    }

    @Test
    void leavingTheTeamReleasesItsTasks_butCancellingAnApplicationDoesNot() {
        ProjectMember member = teammate(70L, CANDIDATE, ProjectRole.CONTRIBUTOR);
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, CANDIDATE)).thenReturn(Optional.of(member));
        projectService.leave(CANDIDATE, PROJECT_ID);
        verify(eventPublisher).publishEvent(new ProjectMemberLeftEvent(PROJECT_ID, CANDIDATE));

        ProjectMember application = ProjectMember.builder().id(74L).project(project).user(developer(6L))
                .role(ProjectRole.CONTRIBUTOR).status(MemberStatus.PENDING).build();
        when(projectMemberRepository.findByProjectIdAndUserId(PROJECT_ID, 6L)).thenReturn(Optional.of(application));
        projectService.leave(6L, PROJECT_ID);
        verify(eventPublisher, never()).publishEvent(new ProjectMemberLeftEvent(PROJECT_ID, 6L));
    }

    // ==================== RÉGLAGES DE L'ESPACE ====================

    @Test
    void theOwnerChangesTheRepositoryAndRecruitmentOnly() {
        project.setDescription("Les horaires des danfo.");
        project.setCoverUrl("media/demo/projects/lagos-transit.webp");
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectRepository.saveAndFlush(project)).thenReturn(project);
        when(projectMapper.toResponse(project)).thenReturn(new ProjectResponse());

        projectService.updateSettings(OWNER, PROJECT_ID, ProjectSettingsRequest.builder()
                .repositoryUrl("  https://github.com/lagos/transit  ")
                .lookingForContributors(false)
                .build());

        assertThat(project.getRepositoryUrl()).isEqualTo("https://github.com/lagos/transit");
        assertThat(project.isLookingForContributors()).isFalse();
        // Le reste du projet ne bouge pas : ni ses textes, ni le chemin de ses images
        assertThat(project.getDescription()).isEqualTo("Les horaires des danfo.");
        assertThat(project.getCoverUrl()).isEqualTo("media/demo/projects/lagos-transit.webp");
    }

    @Test
    void aTeammateDoesNotChangeTheProjectSettings() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(userService.canModerate(CANDIDATE)).thenReturn(false);

        assertThatThrownBy(() -> projectService.updateSettings(CANDIDATE, PROJECT_ID,
                ProjectSettingsRequest.builder().repositoryUrl("").lookingForContributors(true).build()))
                .isInstanceOf(ForbiddenException.class);
        verify(projectRepository, never()).saveAndFlush(any(Project.class));
    }
}
