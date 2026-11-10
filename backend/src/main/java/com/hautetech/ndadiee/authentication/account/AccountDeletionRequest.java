package com.hautetech.ndadiee.authentication.account;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * La suppression de son compte, confirmée par son mot de passe ; ou, pour un compte ouvert avec GitHub ou Google qui
 * n'en a pas, par le code reçu par e-mail.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AccountDeletionRequest {

    @ToString.Exclude
    @Size(max = 72, message = "Le mot de passe ne peut pas dépasser 72 caractères")
    private String password;

    @Pattern(regexp = "^\\s*\\d{6}\\s*$", message = "Le code compte 6 chiffres")
    private String code;
}
