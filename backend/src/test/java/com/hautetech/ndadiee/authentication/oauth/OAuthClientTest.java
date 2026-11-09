package com.hautetech.ndadiee.authentication.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.web.util.UriComponentsBuilder;

import com.hautetech.ndadiee.authentication.oauth.OAuthClient.GithubEmail;
import com.hautetech.ndadiee.model.user.OAuthProvider;

/** L'adresse d'autorisation de chaque fournisseur, et l'adresse e-mail retenue chez GitHub. */
class OAuthClientTest {

    private final OAuthClient client = new OAuthClient(new OAuthProperties(
            new OAuthProperties.Client("gh-id", "gh-secret"), new OAuthProperties.Client("g-id.apps.googleusercontent.com", "g-secret"),
            Duration.ofSeconds(5)));

    private static java.util.Map<String, String> query(String url) {
        return UriComponentsBuilder.fromUri(URI.create(url)).build().getQueryParams().toSingleValueMap();
    }

    @Test
    void githubAuthorizationAsksForTheProfileAndEmailsWithPkce() {
        String url = client.authorizationUrl(OAuthProvider.GITHUB, "https://ndadiee.com/auth/callback/github", "state-1234567890ab", "challenge");

        assertThat(url).startsWith("https://github.com/login/oauth/authorize?");
        assertThat(url).doesNotContain("gh-secret");
        var params = query(url);
        assertThat(params).containsEntry("client_id", "gh-id")
                .containsEntry("state", "state-1234567890ab")
                .containsEntry("code_challenge", "challenge")
                .containsEntry("code_challenge_method", "S256")
                .containsEntry("scope", "read:user%20user:email");
        assertThat(URI.create(url).getQuery()).contains("redirect_uri=https://ndadiee.com/auth/callback/github");
    }

    @Test
    void googleAuthorizationAsksForOpenIdEmailAndProfile() {
        String url = client.authorizationUrl(OAuthProvider.GOOGLE, "https://ndadiee.com/auth/callback/google", "state-1234567890ab", "challenge");

        assertThat(url).startsWith("https://accounts.google.com/o/oauth2/v2/auth?");
        var params = query(url);
        assertThat(params).containsEntry("client_id", "g-id.apps.googleusercontent.com")
                .containsEntry("response_type", "code")
                .containsEntry("scope", "openid%20email%20profile")
                .containsEntry("code_challenge_method", "S256");
    }

    @Test
    void thePrimaryVerifiedEmailWinsAndAnUnverifiedOneNeverDoes() {
        assertThat(OAuthClient.verifiedEmail(List.of(
                new GithubEmail("old@example.com", false, true),
                new GithubEmail("awa@example.com", true, true)))).isEqualTo("awa@example.com");
        // Principale non vérifiée : une autre, vérifiée
        assertThat(OAuthClient.verifiedEmail(List.of(
                new GithubEmail("new@example.com", true, false),
                new GithubEmail("awa@example.com", false, true)))).isEqualTo("awa@example.com");
        assertThat(OAuthClient.verifiedEmail(List.of(new GithubEmail("awa@example.com", true, false)))).isNull();
        assertThat(OAuthClient.verifiedEmail(null)).isNull();
    }
}
