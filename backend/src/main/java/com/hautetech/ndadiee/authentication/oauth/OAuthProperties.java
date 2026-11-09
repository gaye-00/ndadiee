package com.hautetech.ndadiee.authentication.oauth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.hautetech.ndadiee.model.user.OAuthProvider;

/**
 * Les applications OAuth déclarées chez GitHub et Google (« Continuer avec GitHub »). Un fournisseur sans son
 * identifiant et son secret reste « bientôt » sur la page de connexion.
 *
 * @param github  l'OAuth App GitHub (Settings > Developer settings > OAuth Apps)
 * @param google  le client OAuth « Application Web » de Google Cloud (API et services > Identifiants)
 * @param timeout attente maximale d'une réponse du fournisseur
 */
@ConfigurationProperties(prefix = "ndadiee.oauth")
public record OAuthProperties(Client github, Client google, Duration timeout) {

    public OAuthProperties {
        github = github == null ? new Client(null, null) : github;
        google = google == null ? new Client(null, null) : google;
        timeout = timeout == null || timeout.isNegative() || timeout.isZero() ? Duration.ofSeconds(10) : timeout;
    }

    public Client client(OAuthProvider provider) {
        return switch (provider) {
            case GITHUB -> github;
            case GOOGLE -> google;
        };
    }

    /** L'application chez un fournisseur. Le secret ne quitte jamais le serveur. */
    public record Client(String clientId, String clientSecret) {

        public Client {
            clientId = clientId == null || clientId.isBlank() ? null : clientId.trim();
            clientSecret = clientSecret == null || clientSecret.isBlank() ? null : clientSecret.trim();
        }

        public boolean enabled() {
            return clientId != null && clientSecret != null;
        }
    }
}
