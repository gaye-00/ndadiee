package com.hautetech.ndadiee.controller;

import java.util.List;

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
import com.hautetech.ndadiee.dto.request.FeedbackCallRequest;
import com.hautetech.ndadiee.dto.request.FeedbackRequest;
import com.hautetech.ndadiee.dto.response.FeedbackCallResponse;
import com.hautetech.ndadiee.dto.response.FeedbackResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.service.project.FeedbackService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Projets")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{projectId}/feedback-calls")
public class FeedbackController extends BaseController {

    private final FeedbackService feedbackService;

    @Operation(summary = "Demandes de retours ouvertes d'un projet, avec les retours reçus")
    @GetMapping
    public ResponseEntity<ApiResponse<List<FeedbackCallResponse>>> listOpen(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.listOpen(projectId, getOptionalUserId()), "Demandes de retours récupérées avec succès"));
    }

    @Operation(summary = "Demander des retours à la communauté (propriétaire ou mainteneur)")
    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackCallResponse>> createCall(
            @PathVariable Long projectId, @Valid @RequestBody FeedbackCallRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                feedbackService.createCall(getAuthenticatedUserId(), projectId, request), "Demande de retours publiée"));
    }

    @Operation(summary = "Donner son avis (une fois par demande) ; renvoie la demande avec ce retour compté")
    @PostMapping("/{callId}/feedback")
    public ResponseEntity<ApiResponse<FeedbackCallResponse>> give(
            @PathVariable Long projectId, @PathVariable Long callId, @Valid @RequestBody FeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                feedbackService.give(getAuthenticatedUserId(), projectId, callId, request), "Merci pour votre avis"));
    }

    @Operation(summary = "Les retours reçus (équipe du projet, modérateurs)")
    @GetMapping("/{callId}/feedback")
    public ResponseEntity<ApiResponse<PageResponse<FeedbackResponse>>> listFeedback(
            @PathVariable Long projectId, @PathVariable Long callId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.listFeedback(getAuthenticatedUserId(), projectId, callId, pageable), "Retours récupérés avec succès"));
    }
}
