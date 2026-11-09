package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

import com.hautetech.ndadiee.model.user.OAuthProvider;

/**
 * La connexion avec GitHub ou Google n'aboutit pas. Le code d'erreur dit pourquoi : la page de connexion l'explique
 * au membre dans sa langue.
 */
public class OAuthException extends BusinessException {

    private OAuthException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

    /** Fournisseur inconnu, ou pas encore configuré sur ce serveur */
    public static OAuthException unavailable(String provider) {
        return new OAuthException("La connexion avec " + provider + " n'est pas disponible",
                HttpStatus.NOT_FOUND, "OAUTH_PROVIDER_UNAVAILABLE");
    }

    /** L'adresse de retour n'est pas celle du site : le code partirait ailleurs */
    public static OAuthException invalidRedirect() {
        return new OAuthException("Adresse de retour non autorisée", HttpStatus.BAD_REQUEST, "OAUTH_INVALID_REDIRECT");
    }

    /** Le fournisseur refuse le code (expiré, déjà utilisé) ou ne répond pas */
    public static OAuthException failed(OAuthProvider provider) {
        return new OAuthException("La connexion avec " + provider.displayName() + " n'a pas abouti",
                HttpStatus.BAD_REQUEST, "OAUTH_FAILED");
    }

    /** Pas d'adresse e-mail vérifiée chez le fournisseur : impossible de créer ou de retrouver le compte */
    public static OAuthException emailRequired(OAuthProvider provider) {
        return new OAuthException("Ton compte " + provider.displayName() + " n'a pas d'adresse e-mail vérifiée",
                HttpStatus.BAD_REQUEST, "OAUTH_EMAIL_REQUIRED");
    }

    /** Un compte d'administration ne s'ouvre qu'avec son mot de passe */
    public static OAuthException adminAccount() {
        return new OAuthException("Les comptes d'administration se connectent avec leur mot de passe",
                HttpStatus.FORBIDDEN, "OAUTH_ADMIN_ACCOUNT");
    }

    /** Le compte Ndadiee de cette adresse est déjà relié à un autre compte chez ce fournisseur */
    public static OAuthException alreadyLinked(OAuthProvider provider) {
        return new OAuthException("Ce compte Ndadiee est déjà relié à un autre compte " + provider.displayName(),
                HttpStatus.CONFLICT, "OAUTH_ACCOUNT_CONFLICT");
    }
}
