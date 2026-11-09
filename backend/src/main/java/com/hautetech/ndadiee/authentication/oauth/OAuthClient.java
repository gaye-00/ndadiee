package com.hautetech.ndadiee.authentication.oauth;

import java.net.http.HttpClient;
import java.util.List;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hautetech.ndadiee.exception.OAuthException;
import com.hautetech.ndadiee.model.user.OAuthProvider;

import lombok.extern.slf4j.Slf4j;

/**
 * Échanges avec GitHub et Google (OAuth 2, « code d'autorisation » avec PKCE) : l'adresse où envoyer le membre,
 * puis, à son retour, le code contre son profil. Le secret de l'application ne quitte jamais le serveur, et le
 * jeton du fournisseur ne sert qu'à lire le profil : il n'est pas gardé.
 */
@Slf4j
public class OAuthClient {

    private static final String GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
    private static final String GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
    private static final String GITHUB_API = "https://api.github.com";
    // Le profil public, et les adresses e-mail pour trouver la principale vérifiée (elle peut être privée)
    private static final String GITHUB_SCOPE = "read:user user:email";

    private static final String GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String GOOGLE_SCOPE = "openid email profile";

    private final OAuthProperties properties;
    private final RestClient http;

    public OAuthClient(OAuthProperties properties) {
        this.properties = properties;
        HttpClient jdk = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(jdk);
        factory.setReadTimeout(properties.timeout());
        this.http = RestClient.builder()
                .requestFactory(factory)
                // GitHub refuse les requêtes sans User-Agent
                .defaultHeader(HttpHeaders.USER_AGENT, "Ndadiee")
                .build();
    }

    /** L'adresse du fournisseur où le membre accepte (ou refuse) de se connecter à Ndadiee. */
    public String authorizationUrl(OAuthProvider provider, String redirectUri, String state, String codeChallenge) {
        UriComponentsBuilder url = switch (provider) {
            case GITHUB -> UriComponentsBuilder.fromUriString(GITHUB_AUTHORIZE)
                    .queryParam("scope", GITHUB_SCOPE)
                    .queryParam("allow_signup", "true");
            case GOOGLE -> UriComponentsBuilder.fromUriString(GOOGLE_AUTHORIZE)
                    .queryParam("response_type", "code")
                    .queryParam("scope", GOOGLE_SCOPE)
                    // Le choix du compte à chaque fois : on en a souvent plusieurs dans le même navigateur
                    .queryParam("prompt", "select_account");
        };
        return url.queryParam("client_id", properties.client(provider).clientId())
                .queryParam("redirect_uri", redirectUri)
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .build()
                .encode()
                .toUriString();
    }

    /**
     * Échange le code reçu au retour du membre contre son profil.
     *
     * @throws OAuthException le fournisseur refuse le code (expiré, déjà utilisé, mauvais vérificateur) ou ne répond pas
     */
    public OAuthProfile fetchProfile(OAuthProvider provider, String code, String redirectUri, String codeVerifier) {
        try {
            return switch (provider) {
                case GITHUB -> github(code, redirectUri, codeVerifier);
                case GOOGLE -> google(code, redirectUri, codeVerifier);
            };
        } catch (RestClientException e) {
            log.warn("[OAuth] {} : échange refusé ou impossible - {}", provider.displayName(), e.getMessage());
            throw OAuthException.failed(provider);
        }
    }

    // ==================== GITHUB ====================

    private OAuthProfile github(String code, String redirectUri, String codeVerifier) {
        String accessToken = exchange(OAuthProvider.GITHUB, GITHUB_TOKEN, code, redirectUri, codeVerifier);
        GithubUser user = http.get()
                .uri(GITHUB_API + "/user")
                .headers(headers -> githubHeaders(headers, accessToken))
                .retrieve()
                .body(GithubUser.class);
        if (user == null || user.id() == null) {
            throw OAuthException.failed(OAuthProvider.GITHUB);
        }
        List<GithubEmail> emails = http.get()
                .uri(GITHUB_API + "/user/emails")
                .headers(headers -> githubHeaders(headers, accessToken))
                .retrieve()
                .body(new ParameterizedTypeReference<List<GithubEmail>>() {
                });
        return new OAuthProfile(
                OAuthProvider.GITHUB,
                String.valueOf(user.id()),
                verifiedEmail(emails),
                blankToNull(user.name()),
                user.login(),
                blankToNull(user.avatarUrl()),
                blankToNull(user.htmlUrl()));
    }

    private static void githubHeaders(HttpHeaders headers, String accessToken) {
        headers.setBearerAuth(accessToken);
        headers.set(HttpHeaders.ACCEPT, "application/vnd.github+json");
        headers.set("X-GitHub-Api-Version", "2022-11-28");
    }

    /** L'adresse principale si elle est vérifiée, sinon la première vérifiée : jamais une adresse non vérifiée. */
    static String verifiedEmail(List<GithubEmail> emails) {
        if (emails == null) {
            return null;
        }
        return emails.stream()
                .filter(GithubEmail::verified)
                .filter(email -> email.email() != null && !email.email().isBlank())
                .sorted((a, b) -> Boolean.compare(b.primary(), a.primary()))
                .map(GithubEmail::email)
                .findFirst()
                .orElse(null);
    }

    // ==================== GOOGLE ====================

    private OAuthProfile google(String code, String redirectUri, String codeVerifier) {
        String accessToken = exchange(OAuthProvider.GOOGLE, GOOGLE_TOKEN, code, redirectUri, codeVerifier);
        GoogleUser user = http.get()
                .uri(GOOGLE_USERINFO)
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(GoogleUser.class);
        if (user == null || user.sub() == null) {
            throw OAuthException.failed(OAuthProvider.GOOGLE);
        }
        String email = Boolean.TRUE.equals(user.emailVerified()) ? blankToNull(user.email()) : null;
        return new OAuthProfile(
                OAuthProvider.GOOGLE,
                user.sub(),
                email,
                blankToNull(user.name()),
                email == null ? user.name() : email.substring(0, email.indexOf('@')),
                blankToNull(user.picture()),
                null);
    }

    // ==================== COMMUN ====================

    /** Le code et le vérificateur PKCE contre un jeton d'accès, avec le secret de l'application. */
    private String exchange(OAuthProvider provider, String tokenUrl, String code, String redirectUri, String codeVerifier) {
        OAuthProperties.Client client = properties.client(provider);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", client.clientId());
        form.add("client_secret", client.clientSecret());
        form.add("code", code);
        form.add("redirect_uri", redirectUri);
        form.add("code_verifier", codeVerifier);
        TokenResponse token = http.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(form)
                .retrieve()
                .body(TokenResponse.class);
        // GitHub répond 200 même quand il refuse le code : l'erreur est dans le corps
        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            log.warn("[OAuth] {} refuse le code : {} {}", provider.displayName(),
                    token == null ? "réponse vide" : token.error(), token == null ? "" : token.errorDescription());
            throw OAuthException.failed(provider);
        }
        return token.accessToken();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            String error,
            @JsonProperty("error_description") String errorDescription) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GithubUser(
            Long id,
            String login,
            String name,
            @JsonProperty("avatar_url") String avatarUrl,
            @JsonProperty("html_url") String htmlUrl) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GithubEmail(String email, boolean primary, boolean verified) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GoogleUser(
            String sub,
            String name,
            String email,
            @JsonProperty("email_verified") Boolean emailVerified,
            String picture) {
    }
}
