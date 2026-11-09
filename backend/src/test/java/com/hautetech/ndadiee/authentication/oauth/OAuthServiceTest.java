package com.hautetech.ndadiee.authentication.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.exception.OAuthException;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.OAuthProvider;

/**
 * Seuls les fournisseurs configurés sont proposés, et le code ne revient qu'à la page de retour du site (ou de
 * localhost, en développement).
 */
class OAuthServiceTest {

    private static final String CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    private static final String VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

    private OAuthClient client;
    private OAuthAccountService accounts;
    private OAuthService service;

    @BeforeEach
    void setUp() {
        client = mock(OAuthClient.class);
        accounts = mock(OAuthAccountService.class);
        // GitHub configuré, Google pas encore
        OAuthProperties properties = new OAuthProperties(
                new OAuthProperties.Client("gh-client", "gh-secret"), new OAuthProperties.Client(" ", null), Duration.ofSeconds(5));
        service = new OAuthService(properties, client, accounts, "https://ndadiee.com/");
    }

    private static OAuthAuthorizationRequest start(String redirectUri) {
        return OAuthAuthorizationRequest.builder().redirectUri(redirectUri).state("s7c4t3-random-state").codeChallenge(CHALLENGE).build();
    }

    @Test
    void onlyConfiguredProvidersAreOffered() {
        assertThat(service.enabledProviders()).containsExactly("github");
    }

    @Test
    void theSiteAndLocalhostCallbacksAreAccepted() {
        when(client.authorizationUrl(any(), any(), any(), any())).thenReturn("https://github.com/login/oauth/authorize?x");

        assertThat(service.authorization("github", start("https://ndadiee.com/auth/callback/github")).authorizationUrl())
                .startsWith("https://github.com/");
        service.authorization("github", start("http://localhost:5173/auth/callback/github"));
        verify(client).authorizationUrl(OAuthProvider.GITHUB, "https://ndadiee.com/auth/callback/github", "s7c4t3-random-state", CHALLENGE);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "https://evil.example/auth/callback/github",
        "https://ndadiee.com.evil.example/auth/callback/github",
        "https://evil.example/?https://ndadiee.com/auth/callback/github",
        "http://ndadiee.com/auth/callback/github",
        "https://ndadiee.com/auth/callback/google",
        "https://ndadiee.com/login",
        "http://localhost.evil.example/auth/callback/github"
    })
    void aCodeNeverLeavesForAnotherAddress(String redirectUri) {
        assertThatThrownBy(() -> service.authorization("github", start(redirectUri)))
                .isInstanceOf(OAuthException.class)
                .extracting("errorCode").isEqualTo("OAUTH_INVALID_REDIRECT");
        verifyNoInteractions(client);
    }

    @ParameterizedTest
    @ValueSource(strings = { "google", "gitlab", "GITHUB", "" })
    void anUnconfiguredOrUnknownProviderIsUnavailable(String provider) {
        assertThatThrownBy(() -> service.authorization(provider, start("https://ndadiee.com/auth/callback/" + provider)))
                .isInstanceOf(OAuthException.class)
                .extracting("errorCode").isEqualTo("OAUTH_PROVIDER_UNAVAILABLE");
    }

    @Test
    void theReturnedCodeIsExchangedThenTheAccountSignsIn() {
        OAuthProfile profile = new OAuthProfile(OAuthProvider.GITHUB, "1", "awa@example.com", null, "awa", null, null);
        AuthenticationResponse session = AuthenticationResponse.builder().accessToken("jwt").build();
        when(client.fetchProfile(OAuthProvider.GITHUB, "code-123", "https://ndadiee.com/auth/callback/github", VERIFIER))
                .thenReturn(profile);
        when(accounts.signIn(profile, Language.EN)).thenReturn(session);

        OAuthLoginRequest request = OAuthLoginRequest.builder()
                .code("code-123").redirectUri("https://ndadiee.com/auth/callback/github").codeVerifier(VERIFIER)
                .preferredLanguage(Language.EN).build();

        assertThat(service.login("github", request)).isSameAs(session);
    }

    @Test
    void aCodeForAnotherAddressIsNotEvenExchanged() {
        OAuthLoginRequest request = OAuthLoginRequest.builder()
                .code("code-123").redirectUri("https://evil.example/auth/callback/github").codeVerifier(VERIFIER).build();

        assertThatThrownBy(() -> service.login("github", request)).isInstanceOf(OAuthException.class);
        verify(client, never()).fetchProfile(any(), any(), any(), any());
        verifyNoInteractions(accounts);
    }
}
