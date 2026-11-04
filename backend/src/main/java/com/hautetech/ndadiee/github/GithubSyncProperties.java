package com.hautetech.ndadiee.github;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * La synchronisation des pull requests avec le dépôt GitHub de chaque projet (ndadiee.github.sync). Elle passe par
 * l'API GraphQL, qui demande un jeton (ndadiee.github.token) : sans lui, elle ne tourne pas.
 *
 * @param enabled            le planificateur synchronise les projets de lui-même
 * @param interval           délai entre deux synchronisations d'un même projet
 * @param retryAfterNotFound délai avant de réessayer un dépôt introuvable (supprimé, devenu privé, adresse fausse)
 */
@ConfigurationProperties(prefix = "ndadiee.github.sync")
public record GithubSyncProperties(Boolean enabled, Duration interval, Duration retryAfterNotFound) {

    public GithubSyncProperties {
        enabled = enabled == null || enabled;
        interval = interval == null || interval.isNegative() || interval.isZero() ? Duration.ofMinutes(10) : interval;
        retryAfterNotFound = retryAfterNotFound == null || retryAfterNotFound.isNegative() ? Duration.ofHours(6) : retryAfterNotFound;
    }
}
