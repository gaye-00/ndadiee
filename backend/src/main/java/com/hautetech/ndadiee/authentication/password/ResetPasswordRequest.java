package com.hautetech.ndadiee.authentication.password;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/** Le code reçu par e-mail, et le nouveau mot de passe qu'il permet de choisir. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email n'est pas valide")
    private String email;

    @NotBlank(message = "Le code est requis")
    @Pattern(regexp = "^\\s*\\d{6}\\s*$", message = "Le code compte 6 chiffres")
    private String code;

    // Mêmes règles qu'à l'inscription ; 72 = longueur maximale prise en compte par BCrypt
    @ToString.Exclude
    @NotBlank(message = "Le mot de passe est requis")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères")
    private String password;
}
