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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.authentication.UserResponse;
import com.hautetech.ndadiee.dto.request.UpdateProfileRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.UserProfileResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.service.user.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Utilisateurs")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/users")
public class UserController extends BaseController {

    private final UserService userService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    @Operation(summary = "Annuaire des développeurs, filtrable par pays, compétence, niveau et disponibilité")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) ExperienceLevel level,
            @RequestParam(required = false) Boolean openToWork,
            @ParameterObject @PageableDefault(size = 20, sort = "reputation", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.search(q, country, skill, level, openToWork, pageable), "Développeurs récupérés avec succès"));
    }

    @Operation(summary = "Profil public d'un développeur")
    @GetMapping("/{username}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(@PathVariable String username) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getProfile(username, getOptionalUserId()), "Profil récupéré avec succès"));
    }

    @GetMapping("/{username}/followers")
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> getFollowers(
            @PathVariable String username, @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getFollowers(username, pageable), "Abonnés récupérés avec succès"));
    }

    @GetMapping("/{username}/following")
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> getFollowing(
            @PathVariable String username, @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getFollowing(username, pageable), "Abonnements récupérés avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @Operation(summary = "Mettre à jour son propre profil")
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.updateProfile(getAuthenticatedUserId(), request), "Profil mis à jour avec succès"));
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<ApiResponse<Void>> follow(@PathVariable String username) {
        userService.follow(getAuthenticatedUserId(), username);
        return ResponseEntity.ok(ApiResponse.success(null, "Vous suivez maintenant " + username));
    }

    @DeleteMapping("/{username}/follow")
    public ResponseEntity<ApiResponse<Void>> unfollow(@PathVariable String username) {
        userService.unfollow(getAuthenticatedUserId(), username);
        return ResponseEntity.ok(ApiResponse.success(null, "Vous ne suivez plus " + username));
    }
}
