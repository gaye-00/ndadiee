package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.FeedItemResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.service.FeedService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Fil d'actualité")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/feed")
public class FeedController extends BaseController {

    private final FeedService feedService;

    @Operation(summary = "Fil d'actualité : personnalisé (auteurs et tags suivis) pour un membre connecté, général sinon")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FeedItemResponse>>> getFeed(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Language language,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                feedService.getFeed(getOptionalUserId(), tag, country, language, pageable), "Fil récupéré avec succès"));
    }
}
