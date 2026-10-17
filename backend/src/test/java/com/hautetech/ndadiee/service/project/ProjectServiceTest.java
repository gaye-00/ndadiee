package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

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
import com.hautetech.ndadiee.event.ProjectJoinRequestedEvent;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
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
import com.hautetech.ndadiee.repository.ProjectGithubActivityRepository;
import com.hautetech.ndadiee.repository.ProjectMediaRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

/** Candidatures : on postule à un rôle ouvert du projet ; le rôle se ferme quand ses places sont prises. */
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
}
