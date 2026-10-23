package com.hautetech.ndadiee.model.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Énumération des permissions disponibles dans l'application Ndadiee.
 *
 * Chaque permission représente une action autorisée pour une catégorie
 * d'utilisateurs : administrateur, modérateur ou utilisateur standard.
 *
 * La valeur associée à chaque constante suit la convention
 * « rôle:action » et peut être utilisée par le mécanisme
 * d'autorisation pour contrôler l'accès aux fonctionnalités.
 */
@RequiredArgsConstructor
public enum Permission {

    ADMIN_READ("admin:read"),
    ADMIN_UPDATE("admin:update"),
    ADMIN_CREATE("admin:create"),
    ADMIN_DELETE("admin:delete"),
    MODERATOR_READ("moderator:read"),
    MODERATOR_UPDATE("moderator:update"),
    MODERATOR_CREATE("moderator:create"),
    MODERATOR_DELETE("moderator:delete"),
    USER_READ("user:read"),
    USER_UPDATE("user:update"),
    USER_CREATE("user:create"),
    USER_DELETE("user:delete");

    @Getter
    private final String permission;
}
