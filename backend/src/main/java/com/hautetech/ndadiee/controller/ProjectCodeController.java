package com.hautetech.ndadiee.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.ProjectCodeFileResponse;
import com.hautetech.ndadiee.dto.response.ProjectCodeResponse;
import com.hautetech.ndadiee.service.github.RepositoryCodeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Projets")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/projects/{slug}/code")
public class ProjectCodeController extends BaseController {

    private final RepositoryCodeService codeService;

    @Operation(summary = "Le code du projet : sa source (GitHub ou dépôt de démonstration), sa branche et l'arbre de ses fichiers")
    @GetMapping
    public ResponseEntity<ApiResponse<ProjectCodeResponse>> tree(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(codeService.tree(slug, getOptionalUserId()), "Code du projet récupéré avec succès"));
    }

    @Operation(summary = "Un fichier du code du projet : son texte, ou pourquoi il ne s'affiche pas (binaire, trop gros)")
    @GetMapping("/file")
    public ResponseEntity<ApiResponse<ProjectCodeFileResponse>> file(@PathVariable String slug, @RequestParam String path) {
        return ResponseEntity.ok(ApiResponse.success(codeService.file(slug, path, getOptionalUserId()), "Fichier récupéré avec succès"));
    }
}
