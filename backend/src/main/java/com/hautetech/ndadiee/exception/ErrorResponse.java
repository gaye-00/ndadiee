package com.hautetech.ndadiee.exception;

import java.time.Instant;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Format unique de toutes les erreurs renvoyées par l'API. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private int status;
    private String errorCode;
    private String message;

    // Champ en erreur -> message, uniquement pour les erreurs de validation
    private Map<String, String> validationErrors;

    // Précisions propres à l'erreur : le motif d'une suspension (ACCOUNT_BLOCKED)
    private Map<String, String> details;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
