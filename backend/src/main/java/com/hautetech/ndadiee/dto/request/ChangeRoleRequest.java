package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.user.Role;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre une demande de changement de rôle
 * d'un membre de la communauté.
 *
 * Les rôles USER et MODERATOR peuvent être attribués par cette
 * fonctionnalité. Le rôle ADMIN ne peut pas être attribué
 * par ce mécanisme.
 *
 * Les autorisations et les règles d'attribution doivent également
 * être vérifiées par la couche métier.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChangeRoleRequest {

    @NotNull(message = "Le rôle est requis")
    private Role role;
}
