package com.hautetech.ndadiee.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * La vérification de l'adresse e-mail bloque : compte pas encore confirmé, code faux, expiré ou trop essayé. Les
 * détails (l'adresse à confirmer, les essais restants) permettent à la page de le dire précisément.
 */
@Getter
public class EmailVerificationException extends BusinessException {

    private final Map<String, String> details;

    private EmailVerificationException(String message, HttpStatus status, String errorCode, Map<String, String> details) {
        super(message, status, errorCode);
        this.details = details;
    }

    /** Mot de passe juste, mais adresse pas encore confirmée : un code vient de partir (ou part bientôt) */
    public static EmailVerificationException notVerified(String email) {
        return new EmailVerificationException("Confirme ton adresse e-mail avec le code reçu pour te connecter",
                HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", Map.of("email", email));
    }

    /** Code faux (ou aucune inscription en attente pour cette adresse : on ne dit pas laquelle des deux) */
    public static EmailVerificationException invalidCode(int remainingAttempts) {
        return new EmailVerificationException("Code incorrect", HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_INVALID",
                Map.of("remainingAttempts", String.valueOf(remainingAttempts)));
    }

    public static EmailVerificationException expired() {
        return new EmailVerificationException("Ce code a expiré : demandes-en un nouveau", HttpStatus.BAD_REQUEST,
                "VERIFICATION_CODE_EXPIRED", Map.of());
    }

    public static EmailVerificationException tooManyAttempts() {
        return new EmailVerificationException("Trop d'essais pour ce code : demandes-en un nouveau",
                HttpStatus.TOO_MANY_REQUESTS, "VERIFICATION_TOO_MANY_ATTEMPTS", Map.of());
    }
}
