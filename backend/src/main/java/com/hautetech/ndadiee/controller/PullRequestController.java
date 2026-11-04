package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.ReviewCommentRequest;
import com.hautetech.ndadiee.dto.request.ReviewCommentUpdateRequest;
import com.hautetech.ndadiee.dto.request.ReviewSubmitRequest;
import com.hautetech.ndadiee.dto.response.LinkedIssueResponse;
import com.hautetech.ndadiee.dto.response.PullRequestChecksResponse;
import com.hautetech.ndadiee.dto.response.PullRequestDetailResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFilesResponse;
import com.hautetech.ndadiee.dto.response.ReviewCommentResponse;
import com.hautetech.ndadiee.service.review.PullRequestService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * La page d'une revue de code : une pull request prise par son projet et son numéro (« paperweight » et 12), comme
 * son adresse sur le site (/projects/paperweight/reviews/12). Réservée aux membres connectés.
 */
@Tag(name = "Revues de code")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{slug}/pull-requests/{number}")
public class PullRequestController extends BaseController {

    private final PullRequestService pullRequestService;

    @Operation(summary = "Une pull request : son résumé, sa description, sa conversation et ses commentaires de ligne, "
            + "et ce que le membre connecté peut y faire")
    @GetMapping
    public ResponseEntity<ApiResponse<PullRequestDetailResponse>> detail(@PathVariable String slug, @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.detail(getAuthenticatedUserId(), slug, number), "Pull request récupérée avec succès"));
    }

    @Operation(summary = "Ses fichiers modifiés et leur diff, lus sur GitHub au dernier commit de sa branche")
    @GetMapping("/files")
    public ResponseEntity<ApiResponse<PullRequestFilesResponse>> files(@PathVariable String slug, @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.files(getAuthenticatedUserId(), slug, number), "Fichiers modifiés récupérés avec succès"));
    }

    @Operation(summary = "Les vérifications de son dernier commit, une par une")
    @GetMapping("/checks")
    public ResponseEntity<ApiResponse<PullRequestChecksResponse>> checks(@PathVariable String slug, @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.checks(getAuthenticatedUserId(), slug, number), "Vérifications récupérées avec succès"));
    }

    @Operation(summary = "Les issues qu'elle fermera en fusionnant : la tâche à laquelle elle répond")
    @GetMapping("/issues")
    public ResponseEntity<ApiResponse<List<LinkedIssueResponse>>> issues(@PathVariable String slug, @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.issues(getAuthenticatedUserId(), slug, number), "Issues liées récupérées avec succès"));
    }

    @Operation(summary = "Commenter la conversation, ou une ligne du diff avec, peut-être, le code proposé à sa place")
    @PostMapping("/comments")
    public ResponseEntity<ApiResponse<ReviewCommentResponse>> comment(@PathVariable String slug, @PathVariable int number,
            @Valid @RequestBody ReviewCommentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.comment(getAuthenticatedUserId(), slug, number, request), "Commentaire publié"));
    }

    @Operation(summary = "Modifier son commentaire : le texte, et la suggestion d'un commentaire de ligne")
    @PatchMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<ReviewCommentResponse>> updateComment(@PathVariable String slug, @PathVariable int number,
            @PathVariable Long commentId, @Valid @RequestBody ReviewCommentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.updateComment(getAuthenticatedUserId(), slug, number, commentId, request), "Commentaire modifié"));
    }

    @Operation(summary = "Supprimer son commentaire (une revue rendue reste)")
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable String slug, @PathVariable int number,
            @PathVariable Long commentId) {
        pullRequestService.deleteComment(getAuthenticatedUserId(), slug, number, commentId);
        return ResponseEntity.ok(ApiResponse.success(null, "Commentaire supprimé"));
    }

    @Operation(summary = "Rendre sa revue : commentée, approuvée ou changements demandés, avec un message")
    @PostMapping("/reviews")
    public ResponseEntity<ApiResponse<PullRequestDetailResponse>> submitReview(@PathVariable String slug, @PathVariable int number,
            @Valid @RequestBody ReviewSubmitRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.submitReview(getAuthenticatedUserId(), slug, number, request), "Revue rendue"));
    }

    @Operation(summary = "Juger utile la revue d'un relecteur de la communauté (équipe du projet) : +10 de réputation")
    @PutMapping("/reviewers/{reviewerId}/helpful")
    public ResponseEntity<ApiResponse<PullRequestDetailResponse>> markHelpful(@PathVariable String slug, @PathVariable int number,
            @PathVariable Long reviewerId) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.judgeHelpful(getAuthenticatedUserId(), slug, number, reviewerId, true), "Revue jugée utile"));
    }

    @Operation(summary = "Ne plus juger utile la revue d'un relecteur de la communauté")
    @DeleteMapping("/reviewers/{reviewerId}/helpful")
    public ResponseEntity<ApiResponse<PullRequestDetailResponse>> unmarkHelpful(@PathVariable String slug, @PathVariable int number,
            @PathVariable Long reviewerId) {
        return ResponseEntity.ok(ApiResponse.success(
                pullRequestService.judgeHelpful(getAuthenticatedUserId(), slug, number, reviewerId, false), "Revue plus jugée utile"));
    }
}
