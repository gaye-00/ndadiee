package com.hautetech.ndadiee.controller;

import java.time.Instant;

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
import com.hautetech.ndadiee.dto.request.QuestionPeriod;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.response.AnswerResponse;
import com.hautetech.ndadiee.dto.response.BookmarkResponse;
import com.hautetech.ndadiee.dto.response.ForumOverviewResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.dto.response.QuestionSummaryResponse;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.repository.specification.QuestionFilter;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;
import com.hautetech.ndadiee.service.interaction.BookmarkService;

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
    private final BookmarkService bookmarkService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Sujets du forum, filtrables par mot-clé, tag, statut, auteur, « sans réponse », « résolus » et période ; "
            + "following=true : le fil du membre connecté (auteurs et tags qu'il suit). Ordres : createdAt,desc (récents), "
            + "hotness,desc (pertinents), score,desc (top)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QuestionSummaryResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) QuestionStatus status,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) Boolean unanswered,
            @RequestParam(required = false) Boolean solved,
            @RequestParam(required = false) QuestionPeriod period,
            @RequestParam(defaultValue = "false") boolean following,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Instant since = period == null ? null : period.since(Instant.now());
        QuestionFilter filter = new QuestionFilter(q, tag, status, author, unanswered, solved, since, null);
        return ResponseEntity.ok(ApiResponse.success(
                questionService.list(filter, following, getOptionalUserId(), pageable), "Questions récupérées avec succès"));
    }

    @Operation(summary = "Le forum en chiffres (sujets, résolus, sans réponse, réponses, contributeurs) et ses tags les plus utilisés")
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<ForumOverviewResponse>> overview() {
        return ResponseEntity.ok(ApiResponse.success(questionService.overview(), "Vue d'ensemble du forum récupérée"));
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

    @Operation(summary = "Liste de lecture : les sujets enregistrés par le membre, les derniers enregistrés d'abord")
    @GetMapping("/saved")
    public ResponseEntity<ApiResponse<PageResponse<QuestionSummaryResponse>>> saved(
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.listSaved(getAuthenticatedUserId(), pageable), "Liste de lecture récupérée avec succès"));
    }

    @Operation(summary = "Enregistrer un sujet dans sa liste de lecture (sans effet s'il y est déjà)")
    @PostMapping("/{id}/bookmark")
    public ResponseEntity<ApiResponse<BookmarkResponse>> bookmark(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookmarkService.save(getAuthenticatedUserId(), id), "Sujet enregistré"));
    }

    @Operation(summary = "Retirer un sujet de sa liste de lecture (sans effet s'il n'y est pas)")
    @DeleteMapping("/{id}/bookmark")
    public ResponseEntity<ApiResponse<BookmarkResponse>> removeBookmark(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                bookmarkService.remove(getAuthenticatedUserId(), id), "Sujet retiré de la liste de lecture"));
    }

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
