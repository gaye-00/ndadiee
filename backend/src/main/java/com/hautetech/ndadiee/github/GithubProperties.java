package com.hautetech.ndadiee.github;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * L'API publique de GitHub, lue pour préremplir un projet depuis son dépôt (ndadiee.github).
 *
 * @param apiUrl   adresse de l'API (https://api.github.com)
 * @param token    jeton d'accès, facultatif. Sans lui, GitHub accepte 60 requêtes par heure pour tout le serveur ;
 *                 avec lui, 5 000. Un jeton « fine-grained » sans aucune permission suffit : il ne lit que des
 *                 dépôts publics
 * @param timeout  attente maximale d'une réponse
 * @param cacheTtl combien de temps un dépôt lu est gardé en mémoire (réimport, retour en arrière dans le formulaire)
 */
@ConfigurationProperties(prefix = "ndadiee.github")
public record GithubProperties(String apiUrl, String token, Duration timeout, Duration cacheTtl) {

    public GithubProperties {
        apiUrl = apiUrl == null || apiUrl.isBlank() ? "https://api.github.com" : apiUrl.trim().replaceAll("/+$", "");
        token = token == null || token.isBlank() ? null : token.trim();
        timeout = timeout == null || timeout.isNegative() || timeout.isZero() ? Duration.ofSeconds(8) : timeout;
        cacheTtl = cacheTtl == null || cacheTtl.isNegative() ? Duration.ofMinutes(10) : cacheTtl;
    }
}
