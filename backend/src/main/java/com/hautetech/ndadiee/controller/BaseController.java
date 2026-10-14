package com.hautetech.ndadiee.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.hautetech.ndadiee.exception.UnauthorizedException;
import com.hautetech.ndadiee.model.user.User;

/**
 * Accès à l'utilisateur connecté, tel que posé par JwtAuthenticationFilter.
 * Les contrôleurs ne transmettent aux services que son identifiant.
 */
public abstract class BaseController {

    /**
     * Extrait l'ID de l'utilisateur connecté. Throw si non authentifié.
     */
    protected Long getAuthenticatedUserId() {
        Long userId = getOptionalUserId();
        if (userId == null) throw new UnauthorizedException();
        return userId;
    }

    /**
     * Pour les endpoints publics dont la réponse s'enrichit quand on est connecté
     * (vote du membre, « suivi par moi »...). Retourne null pour un visiteur anonyme.
     */
    protected Long getOptionalUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }
}
