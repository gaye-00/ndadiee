package com.hautetech.ndadiee.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un nouveau code pour l'adresse d'une inscription en attente. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResendVerificationRequest {

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email n'est pas valide")
    private String email;
}
