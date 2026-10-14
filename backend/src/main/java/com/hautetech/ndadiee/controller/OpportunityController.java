package com.hautetech.ndadiee.controller;

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
import com.hautetech.ndadiee.dto.request.OpportunityRequest;
import com.hautetech.ndadiee.dto.response.OpportunityResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.service.opportunity.OpportunityService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Opportunités")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/opportunities")
public class OpportunityController extends BaseController {

    private final OpportunityService opportunityService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Emplois, missions freelance, stages et hackathons ; seules les offres ouvertes par défaut")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OpportunityResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) OpportunityType type,
            @RequestParam(required = false) WorkMode workMode,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "false") boolean includeClosed,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.list(q, type, workMode, country, tag, includeClosed, pageable),
                "Opportunités récupérées avec succès"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OpportunityResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.getById(id), "Opportunité récupérée avec succès"));
    }

    // ─── UTILISATEUR CONNECTÉ ─────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<OpportunityResponse>> create(@Valid @RequestBody OpportunityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                opportunityService.create(getAuthenticatedUserId(), request), "Opportunité publiée avec succès"));
    }

    @Operation(summary = "Modifier une opportunité (son auteur ou un modérateur)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OpportunityResponse>> update(
            @PathVariable Long id, @Valid @RequestBody OpportunityRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.update(getAuthenticatedUserId(), id, request), "Opportunité mise à jour avec succès"));
    }

    @Operation(summary = "Clôturer (active = false) ou rouvrir une opportunité sans la supprimer")
    @PatchMapping("/{id}/active")
    public ResponseEntity<ApiResponse<OpportunityResponse>> setActive(
            @PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(ApiResponse.success(
                opportunityService.setActive(getAuthenticatedUserId(), id, active),
                active ? "Opportunité rouverte" : "Opportunité clôturée"));
    }

    @Operation(summary = "Supprimer une opportunité (son auteur ou un modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        opportunityService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Opportunité supprimée avec succès"));
    }
}
