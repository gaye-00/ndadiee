package com.hautetech.ndadiee.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Le code reçu par e-mail, pour confirmer l'adresse d'une inscription. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VerifyEmailRequest {

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email n'est pas valide")
    private String email;

    @NotBlank(message = "Le code est requis")
    @Pattern(regexp = "^\\d{6}$", message = "Le code compte 6 chiffres")
    private String code;
}
