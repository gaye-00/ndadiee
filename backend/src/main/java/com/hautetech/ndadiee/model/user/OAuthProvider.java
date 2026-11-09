package com.hautetech.ndadiee.model.user;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/** Les fournisseurs d'identité avec lesquels on peut se connecter (« Continuer avec GitHub »). */
public enum OAuthProvider {

    GITHUB("GitHub"),
    GOOGLE("Google");

    private final String displayName;

    OAuthProvider(String displayName) {
        this.displayName = displayName;
    }

    /** Le nom montré aux membres, dans les messages (« GitHub ») */
    public String displayName() {
        return displayName;
    }

    /** Le nom dans les adresses : /v1/auth/oauth/github, /auth/callback/github */
    public String slug() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<OAuthProvider> fromSlug(String slug) {
        return Arrays.stream(values()).filter(provider -> provider.slug().equals(slug)).findFirst();
    }
}
