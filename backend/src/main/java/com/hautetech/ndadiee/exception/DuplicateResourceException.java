package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends BusinessException {

    public DuplicateResourceException(String resource, String field, String value) {
        super(resource + " avec " + field + " '" + value + "' existe déjà", HttpStatus.CONFLICT, "DUPLICATE_RESOURCE");
    }
}
