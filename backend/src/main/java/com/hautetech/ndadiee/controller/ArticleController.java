package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import com.hautetech.ndadiee.dto.request.ArticleRequest;
import com.hautetech.ndadiee.dto.response.ArticleResponse;
import com.hautetech.ndadiee.dto.response.ArticleSummaryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.service.content.ArticleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Articles")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/articles")
public class ArticleController extends BaseController {

    private final ArticleService articleService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Articles publiés, filtrables par mot-clé, tag, langue ou auteur")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ArticleSummaryResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Language language,
            @RequestParam(required = false) String author,
            @ParameterObject @PageableDefault(size = 20, sort = "publishedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                articleService.list(q, tag, language, author, pageable), "Articles récupérés avec succès"));
    }

    @Operation(summary = "Détail d'un article (compte une vue) ; un brouillon n'est visible que de son auteur")
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ArticleResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                articleService.getBySlug(slug, getOptionalUserId()), "Article récupéré avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @Operation(summary = "Mes articles, brouillons compris")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PageResponse<ArticleSummaryResponse>>> listMine(
            @RequestParam(required = false) ArticleStatus status,
            @ParameterObject @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                articleService.listMine(getAuthenticatedUserId(), status, pageable), "Articles récupérés avec succès"));
    }

    @Operation(summary = "Créer un article : brouillon par défaut, publié si publish = true")
    @PostMapping
    public ResponseEntity<ApiResponse<ArticleResponse>> create(@Valid @RequestBody ArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                articleService.create(getAuthenticatedUserId(), request), "Article enregistré avec succès"));
    }

    @Operation(summary = "Modifier un article (auteur ou modérateur)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ArticleResponse>> update(
            @PathVariable Long id, @Valid @RequestBody ArticleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                articleService.update(getAuthenticatedUserId(), id, request), "Article mis à jour avec succès"));
    }

    @Operation(summary = "Publier un brouillon")
    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<ArticleResponse>> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                articleService.publish(getAuthenticatedUserId(), id), "Article publié avec succès"));
    }

    @Operation(summary = "Supprimer un article (auteur ou modérateur)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        articleService.delete(getAuthenticatedUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Article supprimé avec succès"));
    }
}
