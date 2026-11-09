package com.hautetech.ndadiee.authentication;

/**
 * L'inscription attend le code envoyé par e-mail : pas encore de session.
 *
 * @param email                    l'adresse où le code est parti
 * @param resendAvailableInSeconds dans combien de secondes un nouveau code peut être demandé
 */
public record PendingVerificationResponse(String email, long resendAvailableInSeconds) {
}
