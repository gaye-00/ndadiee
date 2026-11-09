package com.hautetech.ndadiee.authentication.oauth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Partir chez le fournisseur. L'état et le vérificateur PKCE sont tirés par le navigateur, qui les garde : il
 * reconnaîtra l'état au retour, et seul lui pourra échanger le code (le serveur ne reçoit ici que l'empreinte).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OAuthAuthorizationRequest {

    // https://ndadiee.com/auth/callback/github : la page qui reçoit le code
    @NotBlank(message = "L'adresse de retour est requise")
    @Size(max = 500)
    private String redirectUri;

    @NotBlank(message = "L'état est requis")
    @Pattern(regexp = "^[A-Za-z0-9_-]{16,128}$", message = "État invalide")
    private String state;

    // SHA-256 du vérificateur, en Base64url sans remplissage (RFC 7636)
    @NotBlank(message = "L'empreinte PKCE est requise")
    @Pattern(regexp = "^[A-Za-z0-9_-]{43}$", message = "Empreinte PKCE invalide")
    private String codeChallenge;
}
