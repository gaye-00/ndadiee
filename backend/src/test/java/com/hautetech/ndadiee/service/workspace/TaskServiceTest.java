package com.hautetech.ndadiee.service.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.TaskMoveRequest;
import com.hautetech.ndadiee.dto.request.TaskRequest;
import com.hautetech.ndadiee.dto.response.TaskResponse;
import com.hautetech.ndadiee.event.ProjectMemberLeftEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.workspace.Sprint;
import com.hautetech.ndadiee.model.workspace.Task;
import com.hautetech.ndadiee.model.workspace.TaskStatus;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.TaskRepository;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Le tableau de l'équipe : une tâche se numérote à la suite et arrive en bas de sa colonne ; les places d'une colonne se
 * suivent sans trou à chaque geste ; seuls l'auteur et qui gère l'équipe suppriment ; une tâche livrée ne bouge plus.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    private static final String SLUG = "lagos-transit";
    private static final Long PROJECT_ID = 10L;
    private static final Long TUNDE = 2L;
    private static final Long AMA = 3L;

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private PullRequestRepository pullRequestRepository;
    @Mock
    private ProjectMemberRepository memberRepository;
    @Mock
    private WorkspaceAccess access;
    @Mock
    private UserService userService;
    @Mock
    private TaskPullRequests pullRequests;
    @Mock
    private WorkspaceMapper mapper;

    @InjectMocks
    private TaskService taskService;

    private final Project project = Project.builder().id(PROJECT_ID).slug(SLUG).build();
    private final Developer tunde = developer(TUNDE);

    private static Developer developer(Long id) {
        Developer developer = Developer.builder().username("dev-" + id).build();
        developer.setId(id);
        return developer;
    }

    private static Task task(long id, int number, TaskStatus status, int position) {
        return Task.builder().id(id).number(number).title("Tâche " + number).status(status).position(position)
                .author(developer(AMA)).statusChangedAt(Instant.EPOCH).build();
    }

    // Tunde est de l'équipe : le projet est verrouillé pour son geste
    private void tundeIsInTheTeam() {
        when(access.lockedMember(SLUG, TUNDE)).thenReturn(project);
    }

    private void respondWithTheBoard() {
        when(taskRepository.findBoard(PROJECT_ID)).thenReturn(List.of());
        when(pullRequests.describe(anyList())).thenReturn(Map.of());
    }

    @Test
    void aNewTaskFollowsTheLastNumberAtTheBottomOfItsColumn() {
        tundeIsInTheTeam();
        when(taskRepository.findLastNumber(PROJECT_ID)).thenReturn(48);
        when(taskRepository.countByProjectIdAndSprintIsNullAndStatus(PROJECT_ID, TaskStatus.TODO)).thenReturn(3L);
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(tunde);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pullRequests.describe(anyList())).thenReturn(Map.of());
        when(mapper.toTaskResponse(any(Task.class))).thenReturn(new TaskResponse());

        taskService.create(SLUG, TUNDE, TaskRequest.builder()
                .title("  Notification 5 minutes avant le départ ")
                .description("   ")
                .role(TeamRole.MOBILE)
                .build());

        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(saved.capture());
        Task task = saved.getValue();
        assertThat(task.getNumber()).isEqualTo(49);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
        assertThat(task.getPosition()).isEqualTo(3);
        assertThat(task.getTitle()).isEqualTo("Notification 5 minutes avant le départ");
        assertThat(task.getDescription()).isNull();
        assertThat(task.getAuthor()).isSameAs(tunde);
        assertThat(task.getAssignee()).isNull();
    }

    @Test
    void onlyATeammateTakesATask() {
        tundeIsInTheTeam();
        when(taskRepository.findLastNumber(PROJECT_ID)).thenReturn(0);
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(tunde);
        ProjectMember applicant = ProjectMember.builder().user(developer(7L)).status(MemberStatus.PENDING).build();
        when(memberRepository.findByProjectIdAndUserId(PROJECT_ID, 7L)).thenReturn(Optional.of(applicant));

        assertThatThrownBy(() -> taskService.create(SLUG, TUNDE, TaskRequest.builder().title("Maquette").assigneeId(7L).build()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void aPullRequestFromAnotherProjectIsRefused() {
        tundeIsInTheTeam();
        when(taskRepository.findLastNumber(PROJECT_ID)).thenReturn(0);
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(tunde);
        when(pullRequestRepository.findByProjectIdAndNumber(PROJECT_ID, 999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.create(SLUG, TUNDE, TaskRequest.builder().title("Cache").pullRequestNumber(999).build()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void movingWithinAColumnRenumbersIt() {
        tundeIsInTheTeam();
        Task first = task(1, 33, TaskStatus.TODO, 0);
        Task second = task(2, 40, TaskStatus.TODO, 1);
        Task third = task(3, 46, TaskStatus.TODO, 2);
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 46)).thenReturn(Optional.of(third));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.TODO)).thenReturn(new ArrayList<>(List.of(first, second, third)));
        respondWithTheBoard();

        taskService.move(SLUG, TUNDE, 46, TaskMoveRequest.builder().status(TaskStatus.TODO).position(0).build());

        assertThat(List.of(third.getPosition(), first.getPosition(), second.getPosition())).containsExactly(0, 1, 2);
        // Toujours dans sa colonne : ni date d'arrivée ni « déplacée par »
        assertThat(third.getStatusChangedAt()).isEqualTo(Instant.EPOCH);
        assertThat(third.getMovedBy()).isNull();
    }

    @Test
    void movingToAnotherColumnClosesTheGapAndNotesWhoMovedIt() {
        tundeIsInTheTeam();
        Task offline = task(1, 38, TaskStatus.IN_PROGRESS, 0);
        Task gtfs = task(2, 45, TaskStatus.IN_PROGRESS, 1);
        Task push = task(3, 47, TaskStatus.IN_PROGRESS, 2);
        Task redis = task(4, 77, TaskStatus.IN_REVIEW, 0);
        Task map = task(5, 42, TaskStatus.IN_REVIEW, 1);
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 45)).thenReturn(Optional.of(gtfs));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.IN_PROGRESS)).thenReturn(new ArrayList<>(List.of(offline, gtfs, push)));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.IN_REVIEW)).thenReturn(new ArrayList<>(List.of(redis, map)));
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(tunde);
        respondWithTheBoard();

        taskService.move(SLUG, TUNDE, 45, TaskMoveRequest.builder().status(TaskStatus.IN_REVIEW).position(1).build());

        assertThat(List.of(offline.getPosition(), push.getPosition())).containsExactly(0, 1);
        assertThat(List.of(redis.getPosition(), gtfs.getPosition(), map.getPosition())).containsExactly(0, 1, 2);
        assertThat(gtfs.getStatus()).isEqualTo(TaskStatus.IN_REVIEW);
        assertThat(gtfs.getMovedBy()).isSameAs(tunde);
        assertThat(gtfs.getStatusChangedAt()).isAfter(Instant.EPOCH);
    }

    @Test
    void aPlaceBeyondTheLastOneIsTheBottom() {
        tundeIsInTheTeam();
        Task moving = task(1, 38, TaskStatus.TODO, 0);
        Task done = task(2, 41, TaskStatus.DONE, 0);
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 38)).thenReturn(Optional.of(moving));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.TODO)).thenReturn(new ArrayList<>(List.of(moving)));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.DONE)).thenReturn(new ArrayList<>(List.of(done)));
        when(userService.getDeveloperOrThrow(TUNDE)).thenReturn(tunde);
        respondWithTheBoard();

        taskService.move(SLUG, TUNDE, 38, TaskMoveRequest.builder().status(TaskStatus.DONE).position(40).build());

        assertThat(done.getPosition()).isZero();
        assertThat(moving.getPosition()).isEqualTo(1);
    }

    @Test
    void aTaskDeliveredInAClosedSprintNoLongerMoves() {
        tundeIsInTheTeam();
        Task delivered = task(1, 29, TaskStatus.DONE, 0);
        delivered.setSprint(Sprint.builder().number(6).build());
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 29)).thenReturn(Optional.of(delivered));

        assertThatThrownBy(() -> taskService.move(SLUG, TUNDE, 29, TaskMoveRequest.builder().status(TaskStatus.TODO).position(0).build()))
                .isInstanceOf(OperationNotAllowedException.class);
    }

    @Test
    void onlyItsAuthorOrAManagerDeletesATask() {
        tundeIsInTheTeam();
        Task someoneElses = task(1, 77, TaskStatus.IN_REVIEW, 0);
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 77)).thenReturn(Optional.of(someoneElses));
        when(access.isManager(project, TUNDE)).thenReturn(false);

        assertThatThrownBy(() -> taskService.delete(SLUG, TUNDE, 77)).isInstanceOf(ForbiddenException.class);
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void deletingATaskClosesTheGapInItsColumn() {
        tundeIsInTheTeam();
        Task top = task(1, 33, TaskStatus.TODO, 0);
        Task mine = task(2, 49, TaskStatus.TODO, 1);
        mine.setAuthor(tunde);
        Task bottom = task(3, 51, TaskStatus.TODO, 2);
        when(taskRepository.findByProjectIdAndNumber(PROJECT_ID, 49)).thenReturn(Optional.of(mine));
        when(taskRepository.findColumn(PROJECT_ID, TaskStatus.TODO)).thenReturn(new ArrayList<>(List.of(top, mine, bottom)));

        taskService.delete(SLUG, TUNDE, 49);

        verify(taskRepository).delete(mine);
        assertThat(List.of(top.getPosition(), bottom.getPosition())).containsExactly(0, 1);
    }

    @Test
    void aTeammateWhoLeavesReleasesTheirTasks() {
        taskService.onMemberLeft(new ProjectMemberLeftEvent(PROJECT_ID, AMA));

        verify(taskRepository).unassign(eq(PROJECT_ID), eq(AMA), any(Instant.class));
    }
}
