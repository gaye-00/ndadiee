package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
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
import com.hautetech.ndadiee.dto.request.HackathonRequest;
import com.hautetech.ndadiee.dto.request.HackathonResultRequest;
import com.hautetech.ndadiee.dto.request.HackathonTeamRequest;
import com.hautetech.ndadiee.dto.response.HackathonResponse;
import com.hautetech.ndadiee.dto.response.HackathonTeamResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.hackathon.HackathonStatus;
import com.hautetech.ndadiee.service.hackathon.HackathonService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Hackathons")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/hackathons")
public class HackathonController extends BaseController {

    private final HackathonService hackathonService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Hackathons, filtrables par statut (à venir, en cours, terminés), mot-clé ou thème ; "
            + "sans tri demandé, dans l'ordre qui sert le statut (le plus proche, ou le plus récent, d'abord)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<HackathonResponse>>> list(
            @RequestParam(required = false) HackathonStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.list(status, q, tag, getOptionalUserId(), pageable), "Hackathons récupérés avec succès"));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<HackathonResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.getBySlug(slug, getOptionalUserId()), "Hackathon récupéré avec succès"));
    }

    @Operation(summary = "Équipes inscrites, le palmarès d'abord : leurs membres et les rôles qu'elles recherchent")
    @GetMapping("/{id}/teams")
    public ResponseEntity<ApiResponse<List<HackathonTeamResponse>>> getTeams(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.getTeams(id), "Équipes récupérées avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @Operation(summary = "Hackathons à venir ou en cours où le membre a une équipe, le plus proche d'abord")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<HackathonResponse>>> mine() {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.mine(getAuthenticatedUserId()), "Vos hackathons récupérés avec succès"));
    }

    @Operation(summary = "Inscrire un projet comme équipe (son porteur ou un mainteneur), avant la clôture des inscriptions")
    @PostMapping("/{id}/teams")
    public ResponseEntity<ApiResponse<HackathonTeamResponse>> register(
            @PathVariable Long id, @Valid @RequestBody HackathonTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                hackathonService.register(getAuthenticatedUserId(), id, request), "Équipe inscrite au hackathon"));
    }

    @Operation(summary = "Retirer l'équipe d'un projet, avant le coup d'envoi")
    @DeleteMapping("/{id}/teams/{projectId}")
    public ResponseEntity<ApiResponse<Void>> withdraw(@PathVariable Long id, @PathVariable Long projectId) {
        hackathonService.withdraw(getAuthenticatedUserId(), id, projectId);
        return ResponseEntity.ok(ApiResponse.success(null, "Équipe retirée du hackathon"));
    }

    // ─── MODÉRATION ───────────────────────────────────────────────────────────

    @Operation(summary = "Publier un hackathon (modération)")
    @PostMapping
    public ResponseEntity<ApiResponse<HackathonResponse>> create(@Valid @RequestBody HackathonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                hackathonService.create(getAuthenticatedUserId(), request), "Hackathon publié avec succès"));
    }

    @Operation(summary = "Modifier un hackathon (modération)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<HackathonResponse>> update(
            @PathVariable Long id, @Valid @RequestBody HackathonRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.update(getAuthenticatedUserId(), id, request), "Hackathon mis à jour avec succès"));
    }

    @Operation(summary = "Supprimer un hackathon et ses inscriptions (modération)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        hackathonService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Hackathon supprimé avec succès"));
    }

    @Operation(summary = "Place et distinction d'une équipe au palmarès, une fois le hackathon terminé (modération)")
    @PutMapping("/{id}/teams/{projectId}/result")
    public ResponseEntity<ApiResponse<HackathonTeamResponse>> setResult(
            @PathVariable Long id, @PathVariable Long projectId, @Valid @RequestBody HackathonResultRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                hackathonService.setResult(getAuthenticatedUserId(), id, projectId, request), "Palmarès mis à jour"));
    }
}
