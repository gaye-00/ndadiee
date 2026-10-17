package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends BusinessException {

    public DuplicateResourceException(String resource, String field, String value) {
        this(resource, field, value, null);
    }

    /** @param property le champ de la requête en cause (« email »), renvoyé au formulaire */
    public DuplicateResourceException(String resource, String field, String value, String property) {
        super(resource + " avec " + field + " '" + value + "' existe déjà", HttpStatus.CONFLICT, "DUPLICATE_RESOURCE",
                property);
    }
}
