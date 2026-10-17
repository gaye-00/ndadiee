package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;
    // Le champ de la requête en cause (« email »), quand l'erreur en concerne un : le formulaire l'y affiche
    private final String field;

    protected BusinessException(String message, HttpStatus status, String errorCode) {
        this(message, status, errorCode, null);
    }

    protected BusinessException(String message, HttpStatus status, String errorCode, String field) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.field = field;
    }
}
