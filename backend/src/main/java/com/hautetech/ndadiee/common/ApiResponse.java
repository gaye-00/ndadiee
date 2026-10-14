package com.hautetech.ndadiee.common;

import lombok.AllArgsConstructor;
import lombok.Data;

/** Enveloppe de toutes les réponses réussies de l'API. Les erreurs utilisent ErrorResponse. */
@Data
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, message, data);
    }
}
