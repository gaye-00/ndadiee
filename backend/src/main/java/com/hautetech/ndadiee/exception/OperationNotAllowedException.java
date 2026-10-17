package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

/** Requête valide dans sa forme mais refusée par une règle métier. */
public class OperationNotAllowedException extends BusinessException {

    public OperationNotAllowedException(String message) {
        this(message, null);
    }

    /** @param property le champ de la requête en cause, renvoyé au formulaire */
    public OperationNotAllowedException(String message, String property) {
        super(message, HttpStatus.BAD_REQUEST, "OPERATION_NOT_ALLOWED", property);
    }
}
