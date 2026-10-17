package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.CommunityStatsResponse;
import com.hautetech.ndadiee.service.StatsService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Chiffres")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/stats")
public class StatsController {

    private final StatsService statsService;

    @Operation(summary = "La communauté en chiffres : développeurs, pays, projets, rôles ouverts et places")
    @GetMapping
    public ResponseEntity<ApiResponse<CommunityStatsResponse>> community() {
        return ResponseEntity.ok(ApiResponse.success(statsService.community(), "Chiffres récupérés avec succès"));
    }
}
