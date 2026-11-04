package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Les pull requests d'un projet et son dépôt GitHub : quel dépôt, quand il a été lu pour la dernière fois, ce qui a
 * échoué, et si le membre connecté peut relancer la lecture.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RepositorySyncResponse {

    // Le dépôt : « owner/name » et son adresse ; null si le projet n'a pas de dépôt GitHub
    private String repository;
    private String repositoryUrl;

    // Le serveur sait lire les pull requests (jeton GitHub configuré)
    private boolean available;

    private Instant syncedAt;
    private Instant attemptedAt;

    // Le code d'erreur de la dernière tentative (GITHUB_REPOSITORY_NOT_FOUND, GITHUB_RATE_LIMITED…), null si elle a réussi
    private String error;

    // Les PR ouvertes venues du dépôt
    private long openPullRequests;

    // Le membre connecté peut relancer la synchronisation (porteur ou mainteneur)
    private boolean canSync;
}
