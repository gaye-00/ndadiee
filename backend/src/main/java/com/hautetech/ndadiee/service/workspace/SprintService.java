package com.hautetech.ndadiee.service.workspace;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les sprints de l'équipe (design 3E : « Sprint 7 »). Un seul en cours à la fois ; le porteur et les mainteneurs
 * l'ouvrent et le closent. Le clore range les tâches terminées, livrées pendant ce sprint : elles quittent le tableau,
 * les autres passent au suivant.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final WorkspaceAccess access;
    private final WorkspaceMapper mapper;

    /** Ouvre le sprint suivant : il commence maintenant, pour une à quatre semaines. */
    public SprintResponse start(String slug, Long userId, SprintRequest request) {
        Project project = access.lockedMember(slug, userId);
        access.requireManager(project, userId, "Seuls le porteur et les mainteneurs ouvrent un sprint");
        if (sprintRepository.findByProjectIdAndClosedAtIsNull(project.getId()).isPresent()) {
            throw new ConflictException("Un sprint est déjà en cours : clos-le avant d'en ouvrir un autre");
        }

        Instant now = Instant.now();
        Sprint sprint = sprintRepository.save(Sprint.builder()
                .project(project)
                .number(sprintRepository.findLastNumber(project.getId()) + 1)
                .goal(request.getGoal() == null || request.getGoal().isBlank() ? null : request.getGoal().strip())
                .startsAt(now)
                .endsAt(now.plus(Duration.ofDays(7L * request.getWeeks())))
                .build());
        log.info("[Workspace] Sprint {} ouvert - projet {} - par {}", sprint.getNumber(), project.getId(), userId);
        return withProgress(sprint);
    }

    /** Clôt le sprint en cours : ses tâches terminées sont livrées, et quittent le tableau. */
    public SprintResponse close(String slug, Long userId) {
        Project project = access.lockedMember(slug, userId);
        access.requireManager(project, userId, "Seuls le porteur et les mainteneurs closent un sprint");
        Sprint sprint = sprintRepository.findByProjectIdAndClosedAtIsNull(project.getId())
                .orElseThrow(() -> new OperationNotAllowedException("Aucun sprint n'est en cours"));

        Instant now = Instant.now();
        sprint.setClosedAt(now);
        // La clôture est enregistrée d'abord (flushAutomatically), puis les tâches terminées sont rangées
        int delivered = taskRepository.archiveDone(project.getId(), sprint, TaskStatus.DONE, now);
        log.info("[Workspace] Sprint {} clos - projet {} - {} tâche(s) livrée(s) - par {}", sprint.getNumber(),
                project.getId(), delivered, userId);

        SprintResponse response = mapper.toSprintResponse(sprint);
        response.setTaskCount(delivered);
        response.setDoneCount(delivered);
        return response;
    }

    /** Le sprint en cours du projet, avec l'avancement du tableau. */
    @Transactional(readOnly = true)
    public Optional<SprintResponse> current(Project project) {
        return sprintRepository.findByProjectIdAndClosedAtIsNull(project.getId()).map(this::withProgress);
    }

    @Transactional(readOnly = true)
    public int lastNumber(Project project) {
        return sprintRepository.findLastNumber(project.getId());
    }

    // L'avancement : les tâches du tableau, et celles qui sont terminées
    private SprintResponse withProgress(Sprint sprint) {
        Long projectId = sprint.getProject().getId();
        SprintResponse response = mapper.toSprintResponse(sprint);
        response.setTaskCount(taskRepository.countByProjectIdAndSprintIsNull(projectId));
        response.setDoneCount(taskRepository.countByProjectIdAndSprintIsNullAndStatus(projectId, TaskStatus.DONE));
        return response;
    }
}
