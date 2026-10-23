package com.hautetech.ndadiee.model.user;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Définit les rôles attribuables aux utilisateurs de l'application Ndadiee.
 *
 * Chaque rôle possède un ensemble de permissions qui détermine les actions
 * autorisées à son détenteur. Les rôles sont hiérarchisés par les permissions
 * qu'ils regroupent : USER, MODERATOR et ADMIN.
 *
 * Cette énumération fournit également les autorités reconnues par
 * Spring Security pour appliquer les règles d'autorisation.
 */
@RequiredArgsConstructor
public enum Role {
    USER(
        Set.of(
            Permission.USER_READ,
            Permission.USER_UPDATE,
            Permission.USER_CREATE,
            Permission.USER_DELETE
        )
    ),
    MODERATOR(
        Set.of(
            Permission.MODERATOR_READ,
            Permission.MODERATOR_UPDATE,
            Permission.MODERATOR_CREATE,
            Permission.MODERATOR_DELETE,
            Permission.USER_READ,
            Permission.USER_UPDATE,
            Permission.USER_CREATE,
            Permission.USER_DELETE
        )
    ),
    ADMIN(
        Set.of(
            Permission.ADMIN_READ,
            Permission.ADMIN_UPDATE,
            Permission.ADMIN_CREATE,
            Permission.ADMIN_DELETE,
            Permission.MODERATOR_READ,
            Permission.MODERATOR_UPDATE,
            Permission.MODERATOR_CREATE,
            Permission.MODERATOR_DELETE,
            Permission.USER_READ,
            Permission.USER_UPDATE,
            Permission.USER_CREATE,
            Permission.USER_DELETE
        )
    );

    @Getter
    private final Set<Permission> permissions;

    /** Peut modifier ou supprimer le contenu des autres membres. */
    public boolean canModerate() {
        return this == MODERATOR || this == ADMIN;
    }

    public List<SimpleGrantedAuthority> getAuthorities() {
        var authorities = getPermissions()
            .stream()
            .map(permission -> new SimpleGrantedAuthority(permission.getPermission()))
            .collect(Collectors.toList());
        authorities.add(new SimpleGrantedAuthority("ROLE_" + this.name()));
        return authorities;
    }
}
