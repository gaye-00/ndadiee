package com.hautetech.ndadiee.authentication.oauth;

import com.hautetech.ndadiee.model.Language;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** De retour du fournisseur : le code qu'il a donné, à échanger contre une session Ndadiee. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OAuthLoginRequest {

    @NotBlank(message = "Le code est requis")
    @Size(max = 2048)
    private String code;

    // La même adresse qu'au départ : le fournisseur la vérifie
    @NotBlank(message = "L'adresse de retour est requise")
    @Size(max = 500)
    private String redirectUri;

    // Le vérificateur PKCE, gardé par le navigateur depuis le départ (RFC 7636 : 43 à 128 caractères)
    @NotBlank(message = "Le vérificateur PKCE est requis")
    @Pattern(regexp = "^[A-Za-z0-9._~-]{43,128}$", message = "Vérificateur PKCE invalide")
    private String codeVerifier;

    // La langue de l'interface, pour un compte créé à cette occasion. FR par défaut
    private Language preferredLanguage;
}
