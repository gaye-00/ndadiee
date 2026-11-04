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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.JoinProjectRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.MemberSpecialtyRequest;
import com.hautetech.ndadiee.dto.request.NewProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectMediaRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectSettingsRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectFacetsResponse;
import com.hautetech.ndadiee.dto.response.ProjectMediaResponse;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.specification.ProjectFilter;
import com.hautetech.ndadiee.service.project.ProjectMediaService;
import com.hautetech.ndadiee.service.project.ProjectPublishingService;
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
    private final ProjectMediaService mediaService;
    private final ProjectPublishingService publishingService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Vitrine des projets open source, filtrable par mot-clé, technologie, recherche de contributeurs, "
            + "rôle d'une annonce ouverte ou pays du porteur")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProjectResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean lookingForContributors,
            @RequestParam(required = false) String owner,
            @RequestParam(required = false) TeamRole role,
            @RequestParam(required = false) String country,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        ProjectFilter filter = new ProjectFilter(q, tag, lookingForContributors, owner, role, country);
        return ResponseEntity.ok(ApiResponse.success(
                projectService.list(filter, getOptionalUserId(), pageable), "Projets récupérés avec succès"));
    }

    @Operation(summary = "Facettes de la vitrine : projets par rôle recherché, technologie et pays du porteur, "
            + "chacune avec les autres filtres appliqués")
    @GetMapping("/facets")
    public ResponseEntity<ApiResponse<ProjectFacetsResponse>> facets(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean lookingForContributors,
            @RequestParam(required = false) String owner,
            @RequestParam(required = false) TeamRole role,
            @RequestParam(required = false) String country) {
        ProjectFilter filter = new ProjectFilter(q, tag, lookingForContributors, owner, role, country);
        return ResponseEntity.ok(ApiResponse.success(projectService.facets(filter), "Facettes récupérées avec succès"));
    }

    @Operation(summary = "Page d'un projet : galerie, activité GitHub, rôles ouverts avec leurs candidatures et, pour un membre connecté, sa compatibilité avec chacun")
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

    @Operation(summary = "Publier un projet, avec s'il le faut sa galerie et ses rôles recherchés : tout est créé ensemble, ou rien")
    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(@Valid @RequestBody NewProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                publishingService.publish(getAuthenticatedUserId(), request), "Projet publié avec succès"));
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

    @Operation(summary = "Demander à contribuer à un projet, en visant un de ses rôles ouverts (openingId) et avec un mot pour l'équipe")
    @PostMapping("/{id}/join")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> join(
            @PathVariable Long id, @Valid @RequestBody(required = false) JoinProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                projectService.join(getAuthenticatedUserId(), id, request), "Demande de contribution envoyée"));
    }

    @Operation(summary = "Quitter un projet, ou annuler sa demande en attente")
    @DeleteMapping("/{id}/join")
    public ResponseEntity<ApiResponse<Void>> leave(@PathVariable Long id) {
        projectService.leave(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Vous ne participez plus à ce projet"));
    }

    @Operation(summary = "Choisir le rôle que l'on tient dans l'équipe (membre accepté)")
    @PutMapping("/{id}/members/me")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> updateMySpecialty(
            @PathVariable Long id, @Valid @RequestBody MemberSpecialtyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.updateMySpecialty(getAuthenticatedUserId(), id, request), "Rôle mis à jour"));
    }

    @Operation(summary = "Ajouter une image à la galerie (propriétaire, mainteneur ou modérateur)")
    @PostMapping("/{id}/media")
    public ResponseEntity<ApiResponse<ProjectMediaResponse>> addMedia(
            @PathVariable Long id, @Valid @RequestBody ProjectMediaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                mediaService.add(getAuthenticatedUserId(), id, request), "Image ajoutée à la galerie"));
    }

    @Operation(summary = "Retirer une image de la galerie (propriétaire, mainteneur ou modérateur)")
    @DeleteMapping("/{id}/media/{mediaId}")
    public ResponseEntity<ApiResponse<Void>> deleteMedia(@PathVariable Long id, @PathVariable Long mediaId) {
        mediaService.delete(getAuthenticatedUserId(), id, mediaId);
        return ResponseEntity.ok(ApiResponse.success(null, "Image retirée de la galerie"));
    }

    @Operation(summary = "Accepter ou refuser une demande de contribution (propriétaire ou mainteneur)")
    @PutMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> decide(
            @PathVariable Long id, @PathVariable Long memberId, @Valid @RequestBody MemberDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                projectService.decide(getAuthenticatedUserId(), id, memberId, request), "Demande traitée"));
    }

    @Operation(summary = "Retirer un membre de l'équipe (propriétaire ou mainteneur) ; ses tâches attendent un nouveau preneur")
    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(@PathVariable Long id, @PathVariable Long memberId) {
        projectService.removeMember(getAuthenticatedUserId(), id, memberId);
        return ResponseEntity.ok(ApiResponse.success(null, "Membre retiré de l'équipe"));
    }

    @Operation(summary = "Réglages du projet depuis son espace d'équipe : son dépôt et s'il recrute (porteur ou modérateur)")
    @PatchMapping("/{id}/settings")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateSettings(@PathVariable Long id, @Valid @RequestBody ProjectSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(projectService.updateSettings(getAuthenticatedUserId(), id, request), "Réglages enregistrés"));
    }
}
