package com.hautetech.ndadiee.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.GithubRepositoryResponse;
import com.hautetech.ndadiee.dto.response.GithubRepositorySummaryResponse;
import com.hautetech.ndadiee.service.github.GithubRepositoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Lire un dépôt GitHub public pour préremplir un projet. Réservé aux membres connectés : le quota de GitHub est partagé. */
@Tag(name = "GitHub")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/github")
public class GithubController extends BaseController {

    private final GithubRepositoryService githubRepositoryService;

    @Operation(summary = "Un dépôt public, prêt à préremplir un projet : description, site, licence, technologies proposées, "
            + "introduction du README, et le projet de la vitrine qui pointe déjà vers lui")
    @GetMapping("/repositories/{owner}/{name}")
    public ResponseEntity<ApiResponse<GithubRepositoryResponse>> repository(@PathVariable String owner, @PathVariable String name) {
        getAuthenticatedUserId();
        return ResponseEntity.ok(ApiResponse.success(githubRepositoryService.importRepository(owner, name), "Dépôt lu sur GitHub"));
    }

    @Operation(summary = "Les dépôts récents du membre connecté, d'après le GitHub de son profil (vide s'il ne l'a pas renseigné)")
    @GetMapping("/me/repositories")
    public ResponseEntity<ApiResponse<List<GithubRepositorySummaryResponse>>> myRepositories() {
        return ResponseEntity.ok(ApiResponse.success(
                githubRepositoryService.memberRepositories(getAuthenticatedUserId()), "Dépôts récupérés"));
    }
}
