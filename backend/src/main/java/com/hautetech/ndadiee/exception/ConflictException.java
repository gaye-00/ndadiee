package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

/** Requête en conflit avec l'état actuel : une action déjà faite, qui ne se refait pas (un avis déjà donné). */
public class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT, "CONFLICT");
    }
}
