package com.hautetech.ndadiee.exception;

import org.springframework.http.HttpStatus;

/** Un fichier envoyé refusé : trop lourd, d'un format non accepté, ou trop d'envois d'affilée. */
public class UploadRejectedException extends BusinessException {

    public UploadRejectedException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

    public static UploadRejectedException tooLarge(long maxMegabytes) {
        return new UploadRejectedException("L'image dépasse " + maxMegabytes + " Mo", HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE");
    }

    public static UploadRejectedException unsupported() {
        return new UploadRejectedException("Formats acceptés : JPEG, PNG, WebP et GIF", HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_FILE_TYPE");
    }

    public static UploadRejectedException tooMany(int perHour) {
        return new UploadRejectedException("Tu as envoyé beaucoup d'images : " + perHour + " par heure au plus. Réessaie un peu plus tard.",
                HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_UPLOADS");
    }
}
