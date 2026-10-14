package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.service.project.ProjectService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Projets")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects")
public class ProjectController extends BaseController {

    private final ProjectService projectService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Vitrine des projets open source, filtrable par mot-clé, technologie ou recherche de contributeurs")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProjectResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean lookingForContributors,
            @RequestParam(required = false) String owner,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.list(q, tag, lookingForContributors, owner, getOptionalUserId(), pageable),
                "Projets récupérés avec succès"));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.getBySlug(slug, getOptionalUserId()), "Projet récupéré avec succès"));
    }

    @Operation(summary = "Membres du projet ; le propriétaire et les mainteneurs voient aussi les demandes en attente")
    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.getMembers(id, getOptionalUserId()), "Membres récupérés avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(@Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                projectService.create(getAuthenticatedUserId(), request), "Projet publié avec succès"));
    }

    @Operation(summary = "Modifier un projet (propriétaire ou modérateur)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(
            @PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.update(getAuthenticatedUserId(), id, request), "Projet mis à jour avec succès"));
    }

    @Operation(summary = "Supprimer un projet (propriétaire ou modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        projectService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Projet supprimé avec succès"));
    }

    @Operation(summary = "Demander à contribuer à un projet")
    @PostMapping("/{id}/join")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> join(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                projectService.join(getAuthenticatedUserId(), id), "Demande de contribution envoyée"));
    }

    @Operation(summary = "Quitter un projet, ou annuler sa demande en attente")
    @DeleteMapping("/{id}/join")
    public ResponseEntity<ApiResponse<Void>> leave(@PathVariable Long id) {
        projectService.leave(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Vous ne participez plus à ce projet"));
    }

    @Operation(summary = "Accepter ou refuser une demande de contribution (propriétaire ou mainteneur)")
    @PutMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> decide(
            @PathVariable Long id, @PathVariable Long memberId, @Valid @RequestBody MemberDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.decide(getAuthenticatedUserId(), id, memberId, request), "Demande traitée"));
    }
}
