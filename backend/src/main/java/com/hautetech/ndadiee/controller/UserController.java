package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.authentication.UserResponse;
import com.hautetech.ndadiee.dto.request.EmailPreferencesRequest;
import com.hautetech.ndadiee.dto.request.UpdateProfileRequest;
import com.hautetech.ndadiee.dto.response.CollaboratorResponse;
import com.hautetech.ndadiee.dto.response.ContributionDayResponse;
import com.hautetech.ndadiee.dto.response.MemberProjectResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.UserProfileResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.service.media.AvatarService;
import com.hautetech.ndadiee.service.user.ProfileService;
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
    private final ProfileService profileService;
    private final AvatarService avatarService;

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

    @Operation(summary = "Projets dont le développeur fait partie, avec sa place dans chaque équipe : ceux qu'il porte "
            + "d'abord, puis les plus étoilés")
    @GetMapping("/{username}/projects")
    public ResponseEntity<ApiResponse<PageResponse<MemberProjectResponse>>> getProjects(
            @PathVariable String username, @ParameterObject @PageableDefault(size = 6) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                profileService.getProjects(username, getOptionalUserId(), pageable), "Projets récupérés avec succès"));
    }

    @Operation(summary = "Membres avec qui le développeur a fait équipe, et leurs projets en commun")
    @GetMapping("/{username}/collaborators")
    public ResponseEntity<ApiResponse<List<CollaboratorResponse>>> getCollaborators(@PathVariable String username) {
        return ResponseEntity.ok(ApiResponse.success(
                profileService.getCollaborators(username), "Collaborateurs récupérés avec succès"));
    }

    @Operation(summary = "Contributions du développeur jour par jour sur la dernière année : sujets, réponses, "
            + "commentaires, articles, projets lancés, notes de devlog et retours donnés")
    @GetMapping("/{username}/activity")
    public ResponseEntity<ApiResponse<List<ContributionDayResponse>>> getActivity(@PathVariable String username) {
        return ResponseEntity.ok(ApiResponse.success(
                profileService.getActivity(username), "Contributions récupérées avec succès"));
    }

    // ─── MEMBRE CONNECTÉ ──────────────────────────────────────────────────────

    @Operation(summary = "Mettre à jour son propre profil")
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.updateProfile(getAuthenticatedUserId(), request), "Profil mis à jour avec succès"));
    }

    @Operation(summary = "Choisir les e-mails qu'on reçoit : ceux des revues de code (commentaires, verdicts, revues utiles)")
    @PutMapping("/me/email-preferences")
    public ResponseEntity<ApiResponse<UserResponse>> updateEmailPreferences(@Valid @RequestBody EmailPreferencesRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.updateEmailPreferences(getAuthenticatedUserId(), request), "Préférences d'e-mail enregistrées"));
    }

    @Operation(summary = "Changer sa photo de profil (JPEG, PNG ou WebP, 1 Mo au plus) ; l'ancienne est supprimée du "
            + "stockage des fichiers")
    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> updateAvatar(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                avatarService.replace(getAuthenticatedUserId(), file), "Photo de profil mise à jour"));
    }

    @Operation(summary = "Retirer sa photo de profil")
    @DeleteMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserResponse>> deleteAvatar() {
        return ResponseEntity.ok(ApiResponse.success(
                avatarService.remove(getAuthenticatedUserId()), "Photo de profil retirée"));
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
