package com.hautetech.ndadiee.authentication;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.controller.BaseController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Authentification")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/auth")
public class AuthenticationController extends BaseController {

    private final AuthenticationService authenticationService;

    @Operation(summary = "Créer un compte développeur : un code part par e-mail, le compte s'ouvre avec lui")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<PendingVerificationResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                authenticationService.register(request), "Inscription enregistrée : confirme ton adresse avec le code reçu"));
    }

    @Operation(summary = "Confirmer son adresse avec le code reçu par e-mail, et ouvrir sa session")
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.verifyEmail(request), "Adresse confirmée"));
    }

    @Operation(summary = "Recevoir un nouveau code pour une inscription en attente")
    @PostMapping("/verify-email/resend")
    public ResponseEntity<ApiResponse<PendingVerificationResponse>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.resendVerification(request), "Si une inscription attend son code, un nouveau est parti"));
    }

    @Operation(summary = "Se connecter avec son email ou son nom d'utilisateur")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> login(@Valid @RequestBody AuthenticationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.login(request), "Connexion réussie"));
    }

    @Operation(summary = "Obtenir une nouvelle paire de jetons à partir du refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.refreshToken(request), "Session renouvelée"));
    }

    @Operation(summary = "Ce nom d'utilisateur est-il libre ? Sinon, quelques variantes libres (inscription)")
    @GetMapping("/username-availability")
    public ResponseEntity<ApiResponse<UsernameAvailabilityResponse>> usernameAvailability(@RequestParam String username) {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.checkUsername(username), "Disponibilité vérifiée"));
    }

    @Operation(summary = "Compte de l'utilisateur connecté")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        return ResponseEntity.ok(ApiResponse.success(
                authenticationService.getCurrentUser(getAuthenticatedUserId()), "Utilisateur récupéré avec succès"));
    }
}
