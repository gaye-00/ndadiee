package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.PullRequestResponse;
import com.hautetech.ndadiee.dto.response.ReviewOverviewResponse;
import com.hautetech.ndadiee.service.review.ReviewService;
import com.hautetech.ndadiee.service.review.ReviewTab;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Revues de code")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/reviews")
public class ReviewController extends BaseController {

    private final ReviewService reviewService;

    @Operation(summary = "Les pull requests d'un onglet pour le membre connecté (à relire, communauté, les siennes, "
            + "ses équipes, terminées), filtrables par mot-clé (titre, numéro, projet, branche) et par projet")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PullRequestResponse>>> list(
            @RequestParam(defaultValue = "TO_REVIEW") ReviewTab tab,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String project,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.list(getAuthenticatedUserId(), tab, q, project, pageable), "Revues récupérées avec succès"));
    }

    @Operation(summary = "Les revues en chiffres : totaux des onglets, équipes qui ont des PR ouvertes, bilan de relecteur")
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<ReviewOverviewResponse>> overview() {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.overview(getAuthenticatedUserId()), "Vue d'ensemble des revues récupérée avec succès"));
    }

    @Operation(summary = "Se proposer comme relecteur d'une PR ouverte : de son équipe, ou ouverte à la revue communautaire")
    @PostMapping("/{id}/claim")
    public ResponseEntity<ApiResponse<PullRequestResponse>> claim(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.claim(getAuthenticatedUserId(), id), "Revue prise en charge"));
    }

    @Operation(summary = "Se retirer d'une revue qu'on avait prise, tant qu'on n'a rien rendu")
    @DeleteMapping("/{id}/claim")
    public ResponseEntity<ApiResponse<PullRequestResponse>> release(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.release(getAuthenticatedUserId(), id), "Revue rendue à la communauté"));
    }
}
