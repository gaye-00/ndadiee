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
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.OpeningRoleSummaryResponse;
import com.hautetech.ndadiee.dto.response.OpeningStackSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.service.project.ProjectOpeningService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Annonces : rôles recherchés")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1")
public class ProjectOpeningController extends BaseController {

    private final ProjectOpeningService openingService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Rôles recherchés par les équipes, filtrables par rôle, mot-clé ou technologie")
    @GetMapping("/openings")
    public ResponseEntity<ApiResponse<PageResponse<ProjectOpeningResponse>>> list(
            @RequestParam(required = false) TeamRole role,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                openingService.listOpen(role, q, tag, pageable), "Annonces récupérées avec succès"));
    }

    @Operation(summary = "Pour chaque rôle où l'on recrute : annonces, places et projets concernés")
    @GetMapping("/openings/roles")
    public ResponseEntity<ApiResponse<List<OpeningRoleSummaryResponse>>> summaryByRole() {
        return ResponseEntity.ok(ApiResponse.success(
                openingService.summaryByRole(), "Rôles recherchés récupérés avec succès"));
    }

    @Operation(summary = "Technologies des projets qui recrutent, les plus demandées d'abord, avec leurs annonces et places")
    @GetMapping("/openings/stacks")
    public ResponseEntity<ApiResponse<List<OpeningStackSummaryResponse>>> summaryByStack(
            @RequestParam(defaultValue = "12") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                openingService.summaryByStack(limit), "Technologies recherchées récupérées avec succès"));
    }

    // ─── PORTEUR DU PROJET OU MAINTENEUR ─────────────────────────────────────

    @Operation(summary = "Publier un rôle recherché pour un projet")
    @PostMapping("/projects/{projectId}/openings")
    public ResponseEntity<ApiResponse<ProjectOpeningResponse>> create(
            @PathVariable Long projectId, @Valid @RequestBody ProjectOpeningRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                openingService.create(getAuthenticatedUserId(), projectId, request), "Annonce publiée avec succès"));
    }

    @PutMapping("/openings/{id}")
    public ResponseEntity<ApiResponse<ProjectOpeningResponse>> update(
            @PathVariable Long id, @Valid @RequestBody ProjectOpeningRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                openingService.update(getAuthenticatedUserId(), id, request), "Annonce mise à jour avec succès"));
    }

    @Operation(summary = "Fermer un rôle pourvu, ou le rouvrir")
    @PatchMapping("/openings/{id}/open")
    public ResponseEntity<ApiResponse<ProjectOpeningResponse>> setOpen(
            @PathVariable Long id, @RequestParam boolean open) {
        return ResponseEntity.ok(ApiResponse.success(
                openingService.setOpen(getAuthenticatedUserId(), id, open),
                open ? "Annonce rouverte" : "Annonce fermée"));
    }

    @DeleteMapping("/openings/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        openingService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Annonce supprimée avec succès"));
    }
}
