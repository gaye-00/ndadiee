package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

/**
 * Un geste sensible sur son compte refusé : mot de passe actuel faux, nouveau mot de passe identique, preuve
 * manquante, compte d'administration. Le code d'erreur permet à la page de le dire dans la langue du membre.
 */
public class AccountException extends BusinessException {

    private AccountException(String message, HttpStatus status, String errorCode, String field) {
        super(message, status, errorCode, field);
    }

    /** Le mot de passe saisi pour confirmer n'est pas celui du compte */
    public static AccountException wrongPassword(String field) {
        return new AccountException("Mot de passe incorrect", HttpStatus.BAD_REQUEST, "PASSWORD_INCORRECT", field);
    }

    public static AccountException samePassword() {
        return new AccountException("Choisis un mot de passe différent de l'actuel", HttpStatus.BAD_REQUEST,
                "PASSWORD_UNCHANGED", "newPassword");
    }

    /** Compte ouvert avec GitHub ou Google : pas de mot de passe à confirmer, il en choisit un d'abord */
    public static AccountException noPassword() {
        return new AccountException("Ce compte n'a pas encore de mot de passe : choisis-en un avec « Mot de passe oublié »",
                HttpStatus.BAD_REQUEST, "PASSWORD_NOT_SET", null);
    }

    /** Ni mot de passe ni code : la suppression n'est pas confirmée */
    public static AccountException confirmationRequired() {
        return new AccountException("Confirme avec ton mot de passe, ou avec le code reçu par e-mail",
                HttpStatus.BAD_REQUEST, "CONFIRMATION_REQUIRED", "password");
    }

    public static AccountException adminAccount() {
        return new AccountException("Un compte d'administration ne se supprime pas depuis ses réglages",
                HttpStatus.FORBIDDEN, "ADMIN_ACCOUNT", null);
    }
}
