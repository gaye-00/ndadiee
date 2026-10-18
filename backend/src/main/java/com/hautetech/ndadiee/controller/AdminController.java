package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.AccountStatus;
import com.hautetech.ndadiee.dto.request.ChangeRoleRequest;
import com.hautetech.ndadiee.dto.request.ModerationReasonRequest;
import com.hautetech.ndadiee.dto.request.Visibility;
import com.hautetech.ndadiee.dto.response.AdminActionResponse;
import com.hautetech.ndadiee.dto.response.AdminContentResponse;
import com.hautetech.ndadiee.dto.response.AdminOverviewResponse;
import com.hautetech.ndadiee.dto.response.AdminUserResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.admin.AdminTargetType;
import com.hautetech.ndadiee.model.admin.ModeratedContent;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.service.admin.AdminAuditService;
import com.hautetech.ndadiee.service.admin.AdminContentService;
import com.hautetech.ndadiee.service.admin.AdminOverviewService;
import com.hautetech.ndadiee.service.admin.AdminUserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Le back-office, réservé aux comptes d'administration. Deux barrières : les règles d'URL de
 * SecurityConfiguration (permissions admin:read, admin:update, admin:delete), et @PreAuthorize ci-dessous, qui
 * tient même si une règle d'URL venait à changer.
 */
@Tag(name = "Administration")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController extends BaseController {

    private final AdminOverviewService overviewService;
    private final AdminUserService userService;
    private final AdminContentService contentService;
    private final AdminAuditService auditService;

    // ─── VUE D'ENSEMBLE ───────────────────────────────────────────────────────

    @Operation(summary = "La plateforme en chiffres : membres, contenus, inscriptions des 30 derniers jours, dernières décisions")
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminOverviewResponse>> overview() {
        return ResponseEntity.ok(ApiResponse.success(overviewService.overview(), "Vue d'ensemble récupérée"));
    }

    // ─── COMPTES ──────────────────────────────────────────────────────────────

    @Operation(summary = "Les comptes : recherche (nom d'utilisateur, nom, e-mail), rôle, actifs ou suspendus")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<AdminUserResponse>>> users(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) AccountStatus status,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.list(q, role, status, pageable), "Comptes récupérés avec succès"));
    }

    @Operation(summary = "Suspendre un compte, avec son motif : plus de connexion ni de session (pas un compte d'administration)")
    @PostMapping("/users/{id}/block")
    public ResponseEntity<ApiResponse<AdminUserResponse>> block(
            @PathVariable Long id, @Valid @RequestBody ModerationReasonRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.block(getAuthenticatedUserId(), id, request.getReason()), "Compte suspendu"));
    }

    @Operation(summary = "Réactiver un compte suspendu")
    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<ApiResponse<AdminUserResponse>> unblock(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.unblock(getAuthenticatedUserId(), id), "Compte réactivé"));
    }

    @Operation(summary = "Changer le rôle d'un membre de la communauté : USER ou MODERATOR")
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> changeRole(
            @PathVariable Long id, @Valid @RequestBody ChangeRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.changeRole(getAuthenticatedUserId(), id, request.getRole()), "Rôle mis à jour"));
    }

    // ─── CONTENUS ─────────────────────────────────────────────────────────────

    @Operation(summary = "Sujets, réponses ou projets, masqués compris, les plus récents d'abord : recherche et visibilité")
    @GetMapping("/content")
    public ResponseEntity<ApiResponse<PageResponse<AdminContentResponse>>> content(
            @RequestParam ModeratedContent type,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Visibility visibility,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                contentService.list(type, q, visibility, pageable), "Contenus récupérés avec succès"));
    }

    @Operation(summary = "Masquer un contenu, avec son motif : il quitte les pages publiques, son auteur le voit encore")
    @PostMapping("/content/{type}/{id}/hide")
    public ResponseEntity<ApiResponse<AdminContentResponse>> hide(
            @PathVariable ModeratedContent type, @PathVariable Long id, @Valid @RequestBody ModerationReasonRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                contentService.hide(getAuthenticatedUserId(), type, id, request.getReason()), "Contenu masqué"));
    }

    @Operation(summary = "Rétablir un contenu masqué")
    @PostMapping("/content/{type}/{id}/unhide")
    public ResponseEntity<ApiResponse<AdminContentResponse>> unhide(@PathVariable ModeratedContent type, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                contentService.unhide(getAuthenticatedUserId(), type, id), "Contenu rétabli"));
    }

    @Operation(summary = "Supprimer définitivement un contenu ; le motif, facultatif, va au journal")
    @DeleteMapping("/content/{type}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable ModeratedContent type, @PathVariable Long id, @RequestParam(required = false) String reason) {
        contentService.delete(getAuthenticatedUserId(), type, id, reason);
        return ResponseEntity.ok(ApiResponse.success(null, "Contenu supprimé"));
    }

    // ─── JOURNAL ──────────────────────────────────────────────────────────────

    @Operation(summary = "Le journal de l'administration, les dernières décisions d'abord ; filtrable par type de cible")
    @GetMapping("/actions")
    public ResponseEntity<ApiResponse<PageResponse<AdminActionResponse>>> actions(
            @RequestParam(required = false) AdminTargetType targetType,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                auditService.list(targetType, pageable), "Journal récupéré avec succès"));
    }
}
