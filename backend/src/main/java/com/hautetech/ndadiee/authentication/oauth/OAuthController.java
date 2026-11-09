package com.hautetech.ndadiee.authentication.oauth;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.common.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Connexion avec GitHub ou Google. Le navigateur demande où envoyer le membre, l'y envoie, puis rapporte le code
 * que le fournisseur lui a rendu : la réponse est la même session qu'une connexion par mot de passe.
 */
@Tag(name = "Authentification")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/auth/oauth")
public class OAuthController {

    private final OAuthService oauthService;

    @Operation(summary = "Fournisseurs de connexion disponibles sur ce serveur (github, google)")
    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<List<String>>> providers() {
        return ResponseEntity.ok(ApiResponse.success(oauthService.enabledProviders(), "Fournisseurs récupérés"));
    }

    @Operation(summary = "Adresse du fournisseur où envoyer le membre (état et empreinte PKCE tirés par le navigateur)")
    @PostMapping("/{provider}/authorization")
    public ResponseEntity<ApiResponse<OAuthAuthorizationResponse>> authorization(
            @PathVariable String provider, @Valid @RequestBody OAuthAuthorizationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(oauthService.authorization(provider, request), "Adresse prête"));
    }

    @Operation(summary = "Ouvrir une session avec le code rendu par le fournisseur (compte créé au besoin)")
    @PostMapping("/{provider}/login")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> login(
            @PathVariable String provider, @Valid @RequestBody OAuthLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(oauthService.login(provider, request), "Connexion réussie"));
    }
}
