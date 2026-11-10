package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

/** Le projet n'a pas de code à parcourir dans Ndadiee : pas de dépôt, ou un dépôt hors de GitHub. */
public class CodeUnavailableException extends BusinessException {

    public CodeUnavailableException() {
        super("Le code de ce projet ne se lit pas dans Ndadiee : son dépôt n'est pas un dépôt GitHub public.",
                HttpStatus.NOT_FOUND, "PROJECT_CODE_UNAVAILABLE");
    }
}
