package com.hautetech.ndadiee.authentication.password;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/** Changer de mot de passe depuis ses réglages : l'actuel le confirme. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangePasswordRequest {

    @ToString.Exclude
    @NotBlank(message = "Le mot de passe actuel est requis")
    private String currentPassword;

    @ToString.Exclude
    @NotBlank(message = "Le nouveau mot de passe est requis")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères")
    private String newPassword;
}
