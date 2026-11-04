package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.DashboardResponse;
import com.hautetech.ndadiee.service.dashboard.DashboardService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Atelier")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/dashboard")
public class DashboardController extends BaseController {

    private final DashboardService dashboardService;

    @Operation(summary = "L'atelier du membre connecté : ses projets, les candidatures à étudier, les demandes de retours "
            + "où son avis compte, l'activité de ses équipes et sa réputation de bâtisseur")
    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(
                dashboardService.get(getAuthenticatedUserId()), "Atelier récupéré avec succès"));
    }
}
