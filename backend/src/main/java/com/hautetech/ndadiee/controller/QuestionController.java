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
import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.response.AnswerResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.dto.response.QuestionSummaryResponse;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Questions")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/questions")
public class QuestionController extends BaseController {

    private final QuestionService questionService;
    private final AnswerService answerService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Questions, filtrables par mot-clé, tag, statut, auteur ou « sans réponse »")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QuestionSummaryResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) QuestionStatus status,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) Boolean unanswered,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.list(q, tag, status, author, unanswered, pageable), "Questions récupérées avec succès"));
    }

    @Operation(summary = "Détail d'une question (compte une vue)")
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<QuestionResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.getBySlug(slug, getOptionalUserId()), "Question récupérée avec succès"));
    }

    @Operation(summary = "Réponses d'une question : la réponse acceptée d'abord, puis les mieux notées")
    @GetMapping("/{id}/answers")
    public ResponseEntity<ApiResponse<PageResponse<AnswerResponse>>> getAnswers(
            @PathVariable Long id, @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                answerService.getByQuestion(id, getOptionalUserId(), pageable), "Réponses récupérées avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<QuestionResponse>> create(@Valid @RequestBody QuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                questionService.create(getAuthenticatedUserId(), request), "Question publiée avec succès"));
    }

    @Operation(summary = "Modifier une question (auteur ou modérateur)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> update(
            @PathVariable Long id, @Valid @RequestBody QuestionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.update(getAuthenticatedUserId(), id, request), "Question mise à jour avec succès"));
    }

    @Operation(summary = "Fermer ou rouvrir une question (auteur ou modérateur)")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<QuestionResponse>> changeStatus(
            @PathVariable Long id, @RequestParam QuestionStatus status) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.changeStatus(getAuthenticatedUserId(), id, status), "Statut de la question mis à jour"));
    }

    @Operation(summary = "Supprimer une question (auteur tant qu'elle n'a pas de réponse, ou modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        questionService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Question supprimée avec succès"));
    }

    @PostMapping("/{id}/answers")
    public ResponseEntity<ApiResponse<AnswerResponse>> answer(
            @PathVariable Long id, @Valid @RequestBody AnswerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                answerService.create(getAuthenticatedUserId(), id, request), "Réponse publiée avec succès"));
    }
}
