package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.DevlogEntryRequest;
import com.hautetech.ndadiee.dto.response.DevlogEntryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.service.project.DevlogService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Projets")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{projectId}/devlog")
public class DevlogController extends BaseController {

    private final DevlogService devlogService;

    @Operation(summary = "Devlog d'un projet, les entrées les plus récentes d'abord")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DevlogEntryResponse>>> list(
            @PathVariable Long projectId,
            @ParameterObject @PageableDefault(size = 5, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(devlogService.list(projectId, pageable), "Devlog récupéré avec succès"));
    }

    @Operation(summary = "Écrire dans le devlog (membre de l'équipe)")
    @PostMapping
    public ResponseEntity<ApiResponse<DevlogEntryResponse>> create(
            @PathVariable Long projectId, @Valid @RequestBody DevlogEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                devlogService.create(getAuthenticatedUserId(), projectId, request), "Entrée publiée"));
    }
}
