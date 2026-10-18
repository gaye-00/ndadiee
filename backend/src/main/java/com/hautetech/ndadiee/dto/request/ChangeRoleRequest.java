package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.user.Role;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Nouveau rôle d'un membre de la communauté : USER ou MODERATOR (le rôle ADMIN ne s'attribue pas). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChangeRoleRequest {

    @NotNull(message = "Le rôle est requis")
    private Role role;
}
