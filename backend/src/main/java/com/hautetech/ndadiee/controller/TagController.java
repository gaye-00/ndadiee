package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import com.hautetech.ndadiee.dto.response.TagResponse;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.user.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Tags")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/tags")
public class TagController extends BaseController {

    private final TagService tagService;
    private final UserService userService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Tags, les plus utilisés d'abord ; q filtre par nom (autocomplétion)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<TagResponse>>> search(
            @RequestParam(required = false) String q,
            @ParameterObject @PageableDefault(size = 20, sort = "usageCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(tagService.search(q, pageable), "Tags récupérés avec succès"));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<TagResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                tagService.getBySlug(slug, getOptionalUserId()), "Tag récupéré avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @Operation(summary = "Suivre un tag : son contenu remonte dans le fil personnalisé")
    @PostMapping("/{slug}/follow")
    public ResponseEntity<ApiResponse<Void>> follow(@PathVariable String slug) {
        userService.followTag(getAuthenticatedUserId(), slug);
        return ResponseEntity.ok(ApiResponse.success(null, "Tag suivi"));
    }

    @DeleteMapping("/{slug}/follow")
    public ResponseEntity<ApiResponse<Void>> unfollow(@PathVariable String slug) {
        userService.unfollowTag(getAuthenticatedUserId(), slug);
        return ResponseEntity.ok(ApiResponse.success(null, "Tag retiré de vos suivis"));
    }
}
