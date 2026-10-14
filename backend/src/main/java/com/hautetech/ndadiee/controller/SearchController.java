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
import com.hautetech.ndadiee.dto.request.SearchType;
import com.hautetech.ndadiee.dto.response.SearchResponse;
import com.hautetech.ndadiee.service.SearchService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Recherche")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/search")
public class SearchController extends BaseController {

    private final SearchService searchService;

    @Operation(summary = "Recherche globale ; type limite à une catégorie (questions, articles, projects, users)")
    @GetMapping
    public ResponseEntity<ApiResponse<SearchResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "ALL") SearchType type,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                searchService.search(q, type, getOptionalUserId(), pageable), "Résultats de recherche"));
    }
}
