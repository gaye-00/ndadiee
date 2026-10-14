package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.dto.response.VoteResponse;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.service.interaction.VoteService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Votes")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/votes")
public class VoteController extends BaseController {

    private final VoteService voteService;

    @Operation(summary = "Voter +1 ou -1 sur un contenu, ou inverser son vote. Un +1 sur un projet = une étoile")
    @PostMapping
    public ResponseEntity<ApiResponse<VoteResponse>> vote(@Valid @RequestBody VoteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                voteService.vote(getAuthenticatedUserId(), request), "Vote enregistré"));
    }

    @Operation(summary = "Retirer son vote")
    @DeleteMapping
    public ResponseEntity<ApiResponse<VoteResponse>> removeVote(
            @RequestParam ContentType targetType, @RequestParam Long targetId) {
        return ResponseEntity.ok(ApiResponse.success(
                voteService.removeVote(getAuthenticatedUserId(), targetType, targetId), "Vote retiré"));
    }
}
