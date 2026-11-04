package com.hautetech.ndadiee.service.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.SprintRequest;
import com.hautetech.ndadiee.dto.response.SprintResponse;
import com.hautetech.ndadiee.exception.ConflictException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.workspace.Sprint;
import com.hautetech.ndadiee.model.workspace.TaskStatus;
import com.hautetech.ndadiee.repository.SprintRepository;
import com.hautetech.ndadiee.repository.TaskRepository;

/** Un sprint à la fois, numéroté à la suite ; le clore livre les tâches terminées, qui quittent le tableau. */
@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    private static final String SLUG = "lagos-transit";
    private static final Long PROJECT_ID = 10L;
    private static final Long CHINEDU = 1L;

    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private WorkspaceAccess access;
    @Mock
    private WorkspaceMapper mapper;

    @InjectMocks
    private SprintService sprintService;

    private final Project project = Project.builder().id(PROJECT_ID).slug(SLUG).build();

    @Test
    void theNextSprintFollowsTheLastOneAndLastsItsWeeks() {
        when(access.lockedMember(SLUG, CHINEDU)).thenReturn(project);
        when(sprintRepository.findByProjectIdAndClosedAtIsNull(PROJECT_ID)).thenReturn(Optional.empty());
        when(sprintRepository.findLastNumber(PROJECT_ID)).thenReturn(6);
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toSprintResponse(any(Sprint.class))).thenReturn(new SprintResponse());

        sprintService.start(SLUG, CHINEDU, SprintRequest.builder().goal("  Notifications de départ ").weeks(2).build());

        ArgumentCaptor<Sprint> saved = ArgumentCaptor.forClass(Sprint.class);
        verify(sprintRepository).save(saved.capture());
        Sprint sprint = saved.getValue();
        assertThat(sprint.getNumber()).isEqualTo(7);
        assertThat(sprint.getGoal()).isEqualTo("Notifications de départ");
        assertThat(Duration.between(sprint.getStartsAt(), sprint.getEndsAt())).isEqualTo(Duration.ofDays(14));
        assertThat(sprint.getClosedAt()).isNull();
        verify(access).requireManager(eq(project), eq(CHINEDU), any(String.class));
    }

    @Test
    void aSecondSprintWaitsForTheFirstToClose() {
        when(access.lockedMember(SLUG, CHINEDU)).thenReturn(project);
        when(sprintRepository.findByProjectIdAndClosedAtIsNull(PROJECT_ID)).thenReturn(Optional.of(Sprint.builder().number(7).build()));

        assertThatThrownBy(() -> sprintService.start(SLUG, CHINEDU, SprintRequest.builder().weeks(2).build()))
                .isInstanceOf(ConflictException.class);
        verify(sprintRepository, never()).save(any(Sprint.class));
    }

    @Test
    void closingDeliversTheFinishedTasks() {
        Sprint current = Sprint.builder().id(70L).project(project).number(7).startsAt(Instant.EPOCH).endsAt(Instant.EPOCH.plusSeconds(60)).build();
        when(access.lockedMember(SLUG, CHINEDU)).thenReturn(project);
        when(sprintRepository.findByProjectIdAndClosedAtIsNull(PROJECT_ID)).thenReturn(Optional.of(current));
        when(taskRepository.archiveDone(eq(PROJECT_ID), eq(current), eq(TaskStatus.DONE), any(Instant.class))).thenReturn(4);
        when(mapper.toSprintResponse(current)).thenReturn(new SprintResponse());

        SprintResponse closed = sprintService.close(SLUG, CHINEDU);

        assertThat(current.getClosedAt()).isNotNull();
        assertThat(closed.getTaskCount()).isEqualTo(4);
        assertThat(closed.getDoneCount()).isEqualTo(4);
    }

    @Test
    void thereIsNothingToCloseBetweenTwoSprints() {
        when(access.lockedMember(SLUG, CHINEDU)).thenReturn(project);
        when(sprintRepository.findByProjectIdAndClosedAtIsNull(PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintService.close(SLUG, CHINEDU)).isInstanceOf(OperationNotAllowedException.class);
    }
}
