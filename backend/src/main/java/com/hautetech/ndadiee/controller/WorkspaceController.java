package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.SprintRequest;
import com.hautetech.ndadiee.dto.request.TaskMoveRequest;
import com.hautetech.ndadiee.dto.request.TaskRequest;
import com.hautetech.ndadiee.dto.request.TeamEventRequest;
import com.hautetech.ndadiee.dto.request.TeamMessageRequest;
import com.hautetech.ndadiee.dto.response.SprintResponse;
import com.hautetech.ndadiee.dto.response.TaskPullRequestResponse;
import com.hautetech.ndadiee.dto.response.TaskResponse;
import com.hautetech.ndadiee.dto.response.TeamChatResponse;
import com.hautetech.ndadiee.dto.response.TeamMessageResponse;
import com.hautetech.ndadiee.dto.response.WorkspacePulseResponse;
import com.hautetech.ndadiee.dto.response.WorkspaceResponse;
import com.hautetech.ndadiee.service.workspace.SprintService;
import com.hautetech.ndadiee.service.workspace.TaskService;
import com.hautetech.ndadiee.service.workspace.TeamChatService;
import com.hautetech.ndadiee.service.workspace.WorkspaceService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** L'espace d'équipe d'un projet (design 3E) : tableau, sprints, discussion. Réservé aux membres de l'équipe. */
@Tag(name = "Espace d'équipe")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{slug}/workspace")
public class WorkspaceController extends BaseController {

    private final WorkspaceService workspaceService;
    private final TaskService taskService;
    private final SprintService sprintService;
    private final TeamChatService chatService;

    // ==================== ESPACE ====================

    @Operation(summary = "L'espace : le projet, l'équipe et qui est en ligne, le sprint en cours, ce qui attend dans les onglets")
    @GetMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> overview(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.overview(slug, getAuthenticatedUserId()), "Espace d'équipe récupéré"));
    }

    @Operation(summary = "Le pouls de l'espace : note que le membre est là ; qui est en ligne, et ce qui a changé")
    @PostMapping("/pulse")
    public ResponseEntity<ApiResponse<WorkspacePulseResponse>> pulse(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.pulse(slug, getAuthenticatedUserId()), "Pouls de l'espace"));
    }

    // ==================== TÂCHES ====================

    @Operation(summary = "Le tableau : les tâches de chaque colonne, de haut en bas")
    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> board(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(taskService.board(slug, getAuthenticatedUserId()), "Tableau récupéré"));
    }

    @Operation(summary = "Une tâche, par son numéro, même livrée pendant un sprint clos")
    @GetMapping("/tasks/{number}")
    public ResponseEntity<ApiResponse<TaskResponse>> task(@PathVariable String slug, @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.success(taskService.get(slug, getAuthenticatedUserId(), number), "Tâche récupérée"));
    }

    @Operation(summary = "Créer une tâche, en bas de sa colonne (À faire par défaut)")
    @PostMapping("/tasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(@PathVariable String slug, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(taskService.create(slug, getAuthenticatedUserId(), request), "Tâche créée"));
    }

    @Operation(summary = "Modifier une tâche (une autre colonne l'y envoie, en bas)")
    @PutMapping("/tasks/{number}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(@PathVariable String slug, @PathVariable int number,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.update(slug, getAuthenticatedUserId(), number, request), "Tâche modifiée"));
    }

    @Operation(summary = "Déplacer une tâche à une place d'une colonne ; le tableau entier en retour")
    @PutMapping("/tasks/{number}/position")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> moveTask(@PathVariable String slug, @PathVariable int number,
            @Valid @RequestBody TaskMoveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.move(slug, getAuthenticatedUserId(), number, request), "Tâche déplacée"));
    }

    @Operation(summary = "Supprimer une tâche (son auteur, ou qui gère l'équipe)")
    @DeleteMapping("/tasks/{number}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable String slug, @PathVariable int number) {
        taskService.delete(slug, getAuthenticatedUserId(), number);
        return ResponseEntity.ok(ApiResponse.success(null, "Tâche supprimée"));
    }

    @Operation(summary = "Les pull requests qu'une tâche peut livrer : ouvertes, puis fusionnées ou fermées depuis un mois")
    @GetMapping("/pull-requests")
    public ResponseEntity<ApiResponse<List<TaskPullRequestResponse>>> pullRequests(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(taskService.linkablePullRequests(slug, getAuthenticatedUserId()), "Pull requests récupérées"));
    }

    // ==================== SPRINTS ====================

    @Operation(summary = "Ouvrir le sprint suivant (porteur, mainteneurs)")
    @PostMapping("/sprints")
    public ResponseEntity<ApiResponse<SprintResponse>> startSprint(@PathVariable String slug, @Valid @RequestBody SprintRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(sprintService.start(slug, getAuthenticatedUserId(), request), "Sprint ouvert"));
    }

    @Operation(summary = "Clore le sprint en cours : ses tâches terminées sont livrées et quittent le tableau (porteur, mainteneurs)")
    @PostMapping("/sprints/current/close")
    public ResponseEntity<ApiResponse<SprintResponse>> closeSprint(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(sprintService.close(slug, getAuthenticatedUserId()), "Sprint clos"));
    }

    // ==================== DISCUSSION ====================

    @Operation(summary = "La discussion, dans l'ordre de lecture : les derniers messages, ou ceux d'avant un message ; et le rendez-vous épinglé")
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<TeamChatResponse>> messages(@PathVariable String slug,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "" + TeamChatService.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(ApiResponse.success(chatService.messages(slug, getAuthenticatedUserId(), before, size), "Discussion récupérée"));
    }

    @Operation(summary = "Écrire à l'équipe")
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<TeamMessageResponse>> post(@PathVariable String slug, @Valid @RequestBody TeamMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(chatService.post(slug, getAuthenticatedUserId(), request), "Message envoyé"));
    }

    @Operation(summary = "Proposer un rendez-vous à l'équipe, épinglé dans la discussion")
    @PostMapping("/events")
    public ResponseEntity<ApiResponse<TeamMessageResponse>> schedule(@PathVariable String slug, @Valid @RequestBody TeamEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(chatService.schedule(slug, getAuthenticatedUserId(), request), "Rendez-vous proposé"));
    }

    @Operation(summary = "« J'y serai » : répondre à un rendez-vous")
    @PutMapping("/messages/{id}/attendance")
    public ResponseEntity<ApiResponse<TeamMessageResponse>> attend(@PathVariable String slug, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(chatService.attend(slug, getAuthenticatedUserId(), id, true), "Présence notée"));
    }

    @Operation(summary = "Ne plus venir à un rendez-vous")
    @DeleteMapping("/messages/{id}/attendance")
    public ResponseEntity<ApiResponse<TeamMessageResponse>> unattend(@PathVariable String slug, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(chatService.attend(slug, getAuthenticatedUserId(), id, false), "Présence retirée"));
    }

    @Operation(summary = "Supprimer un message ou un rendez-vous (son auteur, ou qui gère l'équipe)")
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(@PathVariable String slug, @PathVariable Long id) {
        chatService.delete(slug, getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Message supprimé"));
    }
}
