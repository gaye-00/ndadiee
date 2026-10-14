package com.hautetech.ndadiee.controller;

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
import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.CommentUpdateRequest;
import com.hautetech.ndadiee.dto.response.CommentResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.service.interaction.CommentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Commentaires")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/comments")
public class CommentController extends BaseController {

    private final CommentService commentService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Commentaires d'une question, d'une réponse, d'un article ou d'un projet")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> getByTarget(
            @RequestParam ContentType targetType,
            @RequestParam Long targetId,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getByTarget(targetType, targetId, pageable), "Commentaires récupérés avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> create(@Valid @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                commentService.create(getAuthenticatedUserId(), request), "Commentaire publié avec succès"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentResponse>> update(
            @PathVariable Long id, @Valid @RequestBody CommentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.update(getAuthenticatedUserId(), id, request), "Commentaire mis à jour avec succès"));
    }

    @Operation(summary = "Supprimer un commentaire (auteur ou modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        commentService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Commentaire supprimé avec succès"));
    }
}
