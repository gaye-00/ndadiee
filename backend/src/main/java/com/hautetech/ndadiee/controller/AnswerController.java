package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.response.AnswerResponse;
import com.hautetech.ndadiee.service.content.AnswerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Réponses")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/answers")
public class AnswerController extends BaseController {

    private final AnswerService answerService;

    @Operation(summary = "Modifier une réponse (auteur ou modérateur)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AnswerResponse>> update(
            @PathVariable Long id, @Valid @RequestBody AnswerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                answerService.update(getAuthenticatedUserId(), id, request), "Réponse mise à jour avec succès"));
    }

    @Operation(summary = "Supprimer une réponse (auteur ou modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        answerService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Réponse supprimée avec succès"));
    }

    @Operation(summary = "Accepter une réponse comme solution (auteur de la question uniquement)")
    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<AnswerResponse>> accept(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                answerService.accept(getAuthenticatedUserId(), id), "Réponse acceptée"));
    }

    @Operation(summary = "Retirer le statut de solution (auteur de la question uniquement)")
    @DeleteMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<AnswerResponse>> unaccept(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                answerService.unaccept(getAuthenticatedUserId(), id), "La réponse n'est plus marquée comme solution"));
    }
}
