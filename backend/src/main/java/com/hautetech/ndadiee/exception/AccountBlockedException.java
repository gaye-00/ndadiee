package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * Le compte a été suspendu par l'administration : connexion et renouvellement de session refusés. Seul son
 * titulaire l'apprend (le mot de passe est vérifié avant), avec le motif de la suspension.
 */
@Getter
public class AccountBlockedException extends BusinessException {

    private final String reason;

    public AccountBlockedException(String reason) {
        super("Ce compte a été suspendu par l'équipe Ndadiee", HttpStatus.FORBIDDEN, "ACCOUNT_BLOCKED");
        this.reason = reason;
    }
}
