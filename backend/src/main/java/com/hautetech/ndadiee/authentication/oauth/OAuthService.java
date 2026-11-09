package com.hautetech.ndadiee.authentication.oauth;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.exception.OAuthException;
import com.hautetech.ndadiee.model.user.OAuthProvider;

/**
 * Se connecter ou s'inscrire avec GitHub ou Google : où envoyer le membre, puis, à son retour, l'échange du code chez
 * le fournisseur (hors transaction : aucune connexion à la base n'attend le réseau) et la session sur son compte
 * ({@link OAuthAccountService}).
 */
@Service
public class OAuthService {

    // En développement, le front tourne sur localhost. Le fournisseur n'accepte de toute façon que les adresses de
    // retour déclarées dans son application
    private static final Pattern LOCAL_ORIGIN = Pattern.compile("^http://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$");

    private final OAuthProperties properties;
    private final OAuthClient client;
    private final OAuthAccountService accounts;
    private final String frontendUrl;

    public OAuthService(
            OAuthProperties properties,
            OAuthClient client,
            OAuthAccountService accounts,
            @Value("${frontend.url}") String frontendUrl) {
        this.properties = properties;
        this.client = client;
        this.accounts = accounts;
        this.frontendUrl = frontendUrl.trim().replaceAll("/+$", "");
    }

    /** Les fournisseurs configurés sur ce serveur (« github », « google ») : leurs boutons sont actifs. */
    public List<String> enabledProviders() {
        return Arrays.stream(OAuthProvider.values())
                .filter(provider -> properties.client(provider).enabled())
                .map(OAuthProvider::slug)
                .toList();
    }

    /** L'adresse du fournisseur où envoyer le membre. */
    public OAuthAuthorizationResponse authorization(String providerSlug, OAuthAuthorizationRequest request) {
        OAuthProvider provider = enabled(providerSlug);
        requireOwnCallback(provider, request.getRedirectUri());
        return new OAuthAuthorizationResponse(client.authorizationUrl(
                provider, request.getRedirectUri(), request.getState(), request.getCodeChallenge()));
    }

    /** De retour du fournisseur : le code contre une session sur le compte du membre, créé au besoin. */
    public AuthenticationResponse login(String providerSlug, OAuthLoginRequest request) {
        OAuthProvider provider = enabled(providerSlug);
        requireOwnCallback(provider, request.getRedirectUri());
        OAuthProfile profile = client.fetchProfile(provider, request.getCode(), request.getRedirectUri(), request.getCodeVerifier());
        return accounts.signIn(profile, request.getPreferredLanguage());
    }

    private OAuthProvider enabled(String slug) {
        return OAuthProvider.fromSlug(slug)
                .filter(provider -> properties.client(provider).enabled())
                .orElseThrow(() -> OAuthException.unavailable(slug));
    }

    // Le code ne revient qu'au site lui-même : à sa page de retour pour ce fournisseur
    private void requireOwnCallback(OAuthProvider provider, String redirectUri) {
        String path = "/auth/callback/" + provider.slug();
        if (redirectUri == null || !redirectUri.endsWith(path)) {
            throw OAuthException.invalidRedirect();
        }
        String origin = redirectUri.substring(0, redirectUri.length() - path.length());
        if (!origin.equals(frontendUrl) && !LOCAL_ORIGIN.matcher(origin).matches()) {
            throw OAuthException.invalidRedirect();
        }
    }
}
