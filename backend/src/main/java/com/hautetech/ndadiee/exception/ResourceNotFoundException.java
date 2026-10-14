package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " avec l'id " + id + " introuvable", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    public ResourceNotFoundException(String resource, String field, String value) {
        super(resource + " avec " + field + " '" + value + "' introuvable", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}
