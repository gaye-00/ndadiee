package com.hautetech.ndadiee.authentication;

import com.hautetech.ndadiee.model.Language;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Le nom d'utilisateur est requis")
    @Pattern(regexp = "^[a-zA-Z0-9_]{3,30}$",
            message = "Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres ou _")
    private String username;

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email n'est pas valide")
    @Size(max = 255, message = "L'email ne peut pas dépasser 255 caractères")
    private String email;

    // 72 = longueur maximale prise en compte par BCrypt
    @NotBlank(message = "Le mot de passe est requis")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères")
    private String password;

    @NotBlank(message = "Le nom complet est requis")
    @Size(max = 100, message = "Le nom complet ne peut pas dépasser 100 caractères")
    private String fullName;

    @Pattern(regexp = "^[A-Za-z]{2}$", message = "Le pays doit être un code ISO à 2 lettres (SN, CI, NG...)")
    private String country;

    // FR par défaut
    private Language preferredLanguage;
}
