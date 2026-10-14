package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.BadgeResponse;
import com.hautetech.ndadiee.service.badge.BadgeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Badges")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/badges")
public class BadgeController extends BaseController {

    private final BadgeService badgeService;

    @Operation(summary = "Catalogue des badges et de leurs conditions d'obtention")
    @GetMapping
    public ResponseEntity<ApiResponse<List<BadgeResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(badgeService.getAll(), "Badges récupérés avec succès"));
    }
}
