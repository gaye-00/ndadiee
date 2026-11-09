package com.hautetech.ndadiee.authentication.oauth;

import com.hautetech.ndadiee.model.user.OAuthProvider;

/**
 * Le membre tel que GitHub ou Google le décrit, une fois la connexion acceptée chez eux.
 *
 * @param subject      son identifiant chez le fournisseur, qui ne change jamais
 * @param email        son adresse e-mail vérifiée par le fournisseur, sinon null
 * @param fullName     son nom affiché, s'il en a un
 * @param usernameHint de quoi tirer son nom d'utilisateur : le pseudo GitHub, le début de l'adresse Gmail
 * @param avatarUrl    sa photo, hébergée par le fournisseur
 * @param profileUrl   sa page publique (github.com/pseudo), pour GitHub
 */
public record OAuthProfile(
        OAuthProvider provider,
        String subject,
        String email,
        String fullName,
        String usernameHint,
        String avatarUrl,
        String profileUrl) {
}
