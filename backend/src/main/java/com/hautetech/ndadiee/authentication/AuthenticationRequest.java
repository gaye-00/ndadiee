package com.hautetech.ndadiee.authentication;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthenticationRequest {

    // Email ou nom d'utilisateur
    @NotBlank(message = "L'identifiant est requis")
    private String identifier;

    @NotBlank(message = "Le mot de passe est requis")
    private String password;
}
