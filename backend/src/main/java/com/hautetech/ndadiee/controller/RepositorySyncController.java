package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.RepositorySyncResponse;
import com.hautetech.ndadiee.service.github.PullRequestSyncService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Revues de code")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{slug}/repository-sync")
public class RepositorySyncController extends BaseController {

    private final PullRequestSyncService syncService;

    @Operation(summary = "Les pull requests du projet et son dépôt GitHub : dernière lecture, erreur, PR ouvertes")
    @GetMapping
    public ResponseEntity<ApiResponse<RepositorySyncResponse>> status(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                syncService.status(getAuthenticatedUserId(), slug), "Synchronisation GitHub récupérée avec succès"));
    }

    @Operation(summary = "Relire tout de suite les pull requests du dépôt GitHub (porteur ou mainteneur)")
    @PostMapping
    public ResponseEntity<ApiResponse<RepositorySyncResponse>> sync(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                syncService.syncNow(getAuthenticatedUserId(), slug), "Pull requests synchronisées avec GitHub"));
    }
}
