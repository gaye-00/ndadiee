package com.hautetech.ndadiee.service.workspace;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.TaskMoveRequest;
import com.hautetech.ndadiee.dto.request.TaskRequest;
import com.hautetech.ndadiee.dto.response.TaskPullRequestResponse;
import com.hautetech.ndadiee.dto.response.TaskResponse;
import com.hautetech.ndadiee.event.ProjectMemberLeftEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.workspace.Task;
import com.hautetech.ndadiee.model.workspace.TaskStatus;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.TaskRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le tableau de l'équipe (design 3E, 3G) : ses tâches, colonne par colonne, dans l'ordre que l'équipe leur donne.
 *
 * <ul>
 * <li>Chaque membre crée, modifie, déplace et prend une tâche ; seuls son auteur et ceux qui gèrent l'équipe la
 * suppriment.</li>
 * <li>Les places d'une colonne se suivent sans trou (0, 1, 2…) : chaque geste renumérote les colonnes qu'il touche. Les
 * gestes qui numérotent ou rangent verrouillent le projet (WorkspaceAccess.lockedMember) : deux membres qui déplacent
 * des cartes en même temps ne se marchent pas dessus.</li>
 * <li>Une tâche livrée pendant un sprint clos a quitté le tableau : elle se lit encore, mais ne bouge plus.</li>
 * </ul>
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TaskService {

    // Une PR fermée ou fusionnée depuis plus longtemps ne se lie plus à une tâche
    private static final Duration LINKABLE_FOR = Duration.ofDays(30);
    private static final int LINKABLE_LIMIT = 50;

    private final TaskRepository taskRepository;
    private final PullRequestRepository pullRequestRepository;
    private final ProjectMemberRepository memberRepository;
    private final WorkspaceAccess access;
    private final UserService userService;
    private final TaskPullRequests pullRequests;
    private final WorkspaceMapper mapper;

    // ==================== LECTURE ====================

    /** Le tableau : toutes les tâches qui n'ont pas été livrées pendant un sprint clos. */
    @Transactional(readOnly = true)
    public List<TaskResponse> board(String slug, Long userId) {
        Project project = access.member(slug, userId);
        return toResponses(taskRepository.findBoard(project.getId()));
    }

    /** Une tâche, même livrée pendant un sprint clos (une mention « #12 » dans la discussion, un lien partagé). */
    @Transactional(readOnly = true)
    public TaskResponse get(String slug, Long userId, int number) {
        Project project = access.member(slug, userId);
        return toResponse(find(project, number));
    }

    /** Les PR qu'une tâche peut livrer : les ouvertes, puis celles fusionnées ou fermées depuis un mois. */
    @Transactional(readOnly = true)
    public List<TaskPullRequestResponse> linkablePullRequests(String slug, Long userId) {
        Project project = access.member(slug, userId);
        List<PullRequest> linkable = pullRequestRepository.findLinkable(project.getId(), PullRequestStatus.OPEN,
                Instant.now().minus(LINKABLE_FOR), PageRequest.of(0, LINKABLE_LIMIT));
        Map<Long, TaskPullRequestResponse> described = pullRequests.describe(linkable);
        return linkable.stream().map(pullRequest -> described.get(pullRequest.getId())).toList();
    }

    // ==================== ÉCRITURE ====================

    /** Une nouvelle tâche, numérotée à la suite, en bas de sa colonne (À faire par défaut). */
    public TaskResponse create(String slug, Long userId, TaskRequest request) {
        Project project = access.lockedMember(slug, userId);
        TaskStatus status = request.getStatus() == null ? TaskStatus.TODO : request.getStatus();
        Task task = Task.builder()
                .project(project)
                .number(taskRepository.findLastNumber(project.getId()) + 1)
                .status(status)
                .position((int) taskRepository.countByProjectIdAndSprintIsNullAndStatus(project.getId(), status))
                .author(userService.getDeveloperOrThrow(userId))
                .statusChangedAt(Instant.now())
                .build();
        apply(project, task, request);

        Task saved = taskRepository.save(task);
        log.info("[Workspace] Tâche #{} créée - projet {} - par {}", saved.getNumber(), project.getId(), userId);
        return toResponse(saved);
    }

    /**
     * Modifie une tâche : titre, détail, rôle, personne, PR. Une autre colonne l'y envoie, en bas ; pour la placer
     * ailleurs dans une colonne, on la déplace (move).
     */
    public TaskResponse update(String slug, Long userId, int number, TaskRequest request) {
        Project project = access.lockedMember(slug, userId);
        Task task = findOnBoard(project, number);
        apply(project, task, request);
        if (request.getStatus() != null && request.getStatus() != task.getStatus()) {
            relocate(project, task, request.getStatus(), Integer.MAX_VALUE, userId);
        }
        log.info("[Workspace] Tâche #{} modifiée - projet {} - par {}", number, project.getId(), userId);
        // saveAndFlush : la réponse porte la nouvelle date de modification
        return toResponse(taskRepository.saveAndFlush(task));
    }

    /** Glisse une tâche à une place d'une colonne. Le tableau entier en retour : l'ordre de chaque colonne fait foi. */
    public List<TaskResponse> move(String slug, Long userId, int number, TaskMoveRequest request) {
        Project project = access.lockedMember(slug, userId);
        Task task = findOnBoard(project, number);
        relocate(project, task, request.getStatus(), request.getPosition(), userId);
        log.info("[Workspace] Tâche #{} → {} ({}) - projet {} - par {}", number, request.getStatus(), request.getPosition(),
                project.getId(), userId);
        // La requête du tableau enregistre d'abord les places changées
        return toResponses(taskRepository.findBoard(project.getId()));
    }

    /** Supprime une tâche : son auteur, ou qui gère l'équipe. Sa colonne se resserre. */
    public void delete(String slug, Long userId, int number) {
        Project project = access.lockedMember(slug, userId);
        Task task = findOnBoard(project, number);
        if (!task.getAuthor().getId().equals(userId) && !access.isManager(project, userId)) {
            throw new ForbiddenException("Seuls son auteur et ceux qui gèrent l'équipe suppriment une tâche");
        }
        List<Task> column = new ArrayList<>(taskRepository.findColumn(project.getId(), task.getStatus()));
        column.removeIf(candidate -> candidate.getId().equals(task.getId()));
        taskRepository.delete(task);
        renumber(column);
        log.info("[Workspace] Tâche #{} supprimée - projet {} - par {}", number, project.getId(), userId);
    }

    /** Un membre quitte l'équipe (ou en est retiré) : ses tâches attendent un nouveau preneur. */
    @EventListener
    public void onMemberLeft(ProjectMemberLeftEvent event) {
        int released = taskRepository.unassign(event.projectId(), event.userId(), Instant.now());
        if (released > 0) {
            log.info("[Workspace] {} tâche(s) de {} sans preneur - projet {}", released, event.userId(), event.projectId());
        }
    }

    // ==================== HELPERS ====================

    // Ce que l'équipe écrit d'une tâche ; une personne qui n'est pas de l'équipe, une PR qui n'est pas du projet sont
    // refusées
    private void apply(Project project, Task task, TaskRequest request) {
        task.setTitle(request.getTitle().strip());
        task.setDescription(request.getDescription() == null || request.getDescription().isBlank() ? null : request.getDescription().strip());
        task.setRole(request.getRole());
        task.setAssignee(request.getAssigneeId() == null ? null : teammate(project, request.getAssigneeId()));
        task.setPullRequest(request.getPullRequestNumber() == null
                ? null
                : pullRequestRepository.findByProjectIdAndNumber(project.getId(), request.getPullRequestNumber())
                        .orElseThrow(() -> new OperationNotAllowedException(
                                "Pas de pull request #" + request.getPullRequestNumber() + " dans ce projet", "pullRequestNumber")));
    }

    private Developer teammate(Project project, Long userId) {
        return memberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .map(ProjectMember::getUser)
                .orElseThrow(() -> new OperationNotAllowedException("Cette personne ne fait pas partie de l'équipe", "assigneeId"));
    }

    /**
     * La tâche quitte sa place pour une autre, dans sa colonne ou une autre (au-delà de la dernière place : en bas). Les
     * colonnes touchées sont renumérotées ; changer de colonne note quand, et qui l'a déplacée.
     */
    private void relocate(Project project, Task task, TaskStatus to, int position, Long moverId) {
        TaskStatus from = task.getStatus();
        List<Task> source = new ArrayList<>(taskRepository.findColumn(project.getId(), from));
        source.removeIf(candidate -> candidate.getId().equals(task.getId()));
        List<Task> target = from == to ? source : new ArrayList<>(taskRepository.findColumn(project.getId(), to));
        target.add(Math.min(position, target.size()), task);

        if (from != to) {
            task.setStatus(to);
            task.setStatusChangedAt(Instant.now());
            task.setMovedBy(userService.getDeveloperOrThrow(moverId));
            renumber(source);
        }
        renumber(target);
    }

    // Les places d'une colonne, de 0 en haut, sans trou ; seules celles qui changent sont écrites
    private static void renumber(List<Task> column) {
        for (int index = 0; index < column.size(); index++) {
            Task task = column.get(index);
            if (task.getPosition() != index) {
                task.setPosition(index);
            }
        }
    }

    private Task find(Project project, int number) {
        return taskRepository.findByProjectIdAndNumber(project.getId(), number)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche", "numéro", "#" + number));
    }

    // Une tâche livrée pendant un sprint clos ne bouge plus
    private Task findOnBoard(Project project, int number) {
        Task task = find(project, number);
        if (task.getSprint() != null) {
            throw new OperationNotAllowedException("Cette tâche a été livrée au sprint " + task.getSprint().getNumber()
                    + " : elle ne se modifie plus");
        }
        return task;
    }

    private TaskResponse toResponse(Task task) {
        return toResponses(List.of(task)).get(0);
    }

    // Les PR liées et le verdict de leur revue : une requête pour tout le tableau
    private List<TaskResponse> toResponses(List<Task> tasks) {
        Map<Long, TaskPullRequestResponse> linked = pullRequests.describe(tasks.stream().map(Task::getPullRequest).toList());
        return tasks.stream()
                .map(task -> {
                    TaskResponse response = mapper.toTaskResponse(task);
                    if (task.getPullRequest() != null) {
                        response.setPullRequest(linked.get(task.getPullRequest().getId()));
                    }
                    return response;
                })
                .toList();
    }
}
