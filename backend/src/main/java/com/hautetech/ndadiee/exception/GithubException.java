package com.hautetech.ndadiee.exception;

import java.time.Duration;
import java.time.Instant;

import org.springframework.http.HttpStatus;

/** GitHub n'a pas pu répondre : dépôt introuvable (ou privé), quota de requêtes atteint, ou service injoignable. */
public class GithubException extends BusinessException {

    private GithubException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

    public static GithubException notFound() {
        return new GithubException("Dépôt introuvable sur GitHub : vérifie l'adresse. Un dépôt privé ne peut pas être importé.",
                HttpStatus.NOT_FOUND, "GITHUB_REPOSITORY_NOT_FOUND");
    }

    /** @param resetAt quand GitHub acceptera de nouveau des requêtes ; null s'il ne l'a pas dit */
    public static GithubException rateLimited(Instant resetAt) {
        // Arrondi à la minute supérieure : « dans 1 min » plutôt que « dans 0 min »
        String when = resetAt == null ? "dans quelques minutes"
                : "dans " + Math.max(1, (Duration.between(Instant.now(), resetAt).getSeconds() + 59) / 60) + " min";
        return new GithubException("GitHub limite les requêtes pour le moment : réessaie " + when + ", ou remplis le projet à la main.",
                HttpStatus.TOO_MANY_REQUESTS, "GITHUB_RATE_LIMITED");
    }

    /** Le serveur n'a pas de jeton GitHub : l'API GraphQL (les pull requests) refuse les requêtes anonymes */
    public static GithubException notConfigured() {
        return new GithubException("La synchronisation avec GitHub n'est pas configurée sur ce serveur (jeton GITHUB_TOKEN manquant).",
                HttpStatus.SERVICE_UNAVAILABLE, "GITHUB_NOT_CONFIGURED");
    }

    public static GithubException unavailable() {
        return new GithubException("GitHub ne répond pas pour le moment : réessaie un peu plus tard, ou remplis le projet à la main.",
                HttpStatus.BAD_GATEWAY, "GITHUB_UNAVAILABLE");
    }
}
