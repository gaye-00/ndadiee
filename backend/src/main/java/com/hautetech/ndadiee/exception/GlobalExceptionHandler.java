package com.hautetech.ndadiee.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ==================== Business exceptions ====================

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex) {
        log.warn("Business exception: {}", ex.getMessage());
        if (ex.getField() == null) {
            return buildResponse(ex.getStatus(), ex.getErrorCode(), ex.getMessage());
        }
        // Erreur d'un champ (« email déjà utilisé ») : le formulaire l'affiche sous ce champ
        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .validationErrors(Map.of(ex.getField(), ex.getMessage()))
                .build();
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    // Compte suspendu : le motif accompagne le refus, le formulaire de connexion l'affiche
    @ExceptionHandler(AccountBlockedException.class)
    public ResponseEntity<ErrorResponse> handleAccountBlocked(AccountBlockedException ex) {
        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .details(ex.getReason() == null ? null : Map.of("reason", ex.getReason()))
                .build();
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    // Vérification de l'adresse e-mail : l'adresse à confirmer, les essais restants accompagnent le refus
    @ExceptionHandler(EmailVerificationException.class)
    public ResponseEntity<ErrorResponse> handleEmailVerification(EmailVerificationException ex) {
        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .details(ex.getDetails().isEmpty() ? null : ex.getDetails())
                .build();
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    // ==================== Validation ====================

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> errors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .errorCode("VALIDATION_ERROR")
                .message("Erreur de validation")
                .validationErrors(errors)
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER",
                "Paramètre requis manquant: " + ex.getParameterName());
    }

    // Valeur d'enum inconnue ou identifiant non numérique dans l'URL
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
                "Valeur invalide pour le paramètre '" + ex.getName() + "'");
    }

    // JSON mal formé, ou valeur d'enum inconnue dans le corps
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        // Le détail (champ fautif, type attendu) reste dans les logs : il aide à déboguer sans décrire nos classes au client
        log.warn("Corps de requête illisible: {}", ex.getMostSpecificCause().getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Corps de requête illisible ou invalide");
    }

    // Tri demandé sur un champ qui n'existe pas (?sort=...)
    @ExceptionHandler({ PropertyReferenceException.class, InvalidDataAccessApiUsageException.class })
    public ResponseEntity<ErrorResponse> handleInvalidSort(RuntimeException ex) {
        log.warn("Requête de données invalide: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER", "Paramètre de tri ou de filtre invalide");
    }

    // ==================== Security ====================

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Identifiant ou mot de passe incorrect");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accès refusé");
    }

    // ==================== HTTP ====================

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                "Méthode " + ex.getMethod() + " non supportée");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return buildResponse(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Type de contenu non supporté, utilisez application/json");
    }

    // Au-delà de la limite des requêtes (spring.servlet.multipart) : le fichier n'a même pas été lu
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE", "Le fichier est trop lourd");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "ENDPOINT_NOT_FOUND", "Endpoint introuvable");
    }

    // ==================== Data integrity ====================

    // Filet de sécurité : deux requêtes simultanées qui passent toutes les deux les vérifications applicatives
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return buildResponse(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE",
                "Cette opération entre en conflit avec des données existantes");
    }

    // ==================== Client parti ====================

    // Le navigateur a fermé la connexion avant la réponse (page quittée ou rechargée, requête annulée) :
    // rien à répondre, et ce n'est pas une erreur du serveur. Sans ce gestionnaire, le filet de sécurité
    // ci-dessous la journalisait en ERROR, pile complète comprise (« Broken pipe »).
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleClientGone(AsyncRequestNotUsableException ex) {
        log.debug("Réponse abandonnée, le client a fermé la connexion : {}", ex.getMessage());
    }

    // ==================== Catch-all ====================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Erreur interne non gérée", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Une erreur interne est survenue");
    }

    // ==================== Helper ====================

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String errorCode, String message) {
        ErrorResponse response = ErrorResponse.builder()
                .status(status.value())
                .errorCode(errorCode)
                .message(message)
                .build();
        return ResponseEntity.status(status).body(response);
    }
}
