package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected BusinessException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
