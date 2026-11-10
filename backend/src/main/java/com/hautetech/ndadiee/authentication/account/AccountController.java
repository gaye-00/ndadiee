package com.hautetech.ndadiee.authentication.account;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.authentication.PendingVerificationResponse;
import com.hautetech.ndadiee.authentication.password.ChangePasswordRequest;
import com.hautetech.ndadiee.authentication.password.PasswordService;
import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.controller.BaseController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** La sécurité de son compte : changer de mot de passe, supprimer son compte. */
@Tag(name = "Compte")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/users/me")
public class AccountController extends BaseController {

    private final PasswordService passwordService;
    private final AccountDeletionService deletionService;

    @Operation(summary = "Changer de mot de passe, en confirmant l'actuel : les autres sessions se ferment, celle-ci reçoit de nouveaux jetons")
    @PutMapping("/password")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                passwordService.change(getAuthenticatedUserId(), request), "Mot de passe changé"));
    }

    @Operation(summary = "Ce que la suppression du compte ferait : le délai pour changer d'avis, la preuve demandée, le sort de ses projets")
    @GetMapping("/deletion")
    public ResponseEntity<ApiResponse<AccountDeletionPreview>> deletionPreview() {
        return ResponseEntity.ok(ApiResponse.success(
                deletionService.preview(getAuthenticatedUserId()), "Aperçu de la suppression"));
    }

    @Operation(summary = "Recevoir un code pour confirmer la suppression d'un compte sans mot de passe (GitHub, Google)")
    @PostMapping("/deletion/code")
    public ResponseEntity<ApiResponse<PendingVerificationResponse>> deletionCode() {
        return ResponseEntity.ok(ApiResponse.success(
                deletionService.sendCode(getAuthenticatedUserId()), "Code envoyé"));
    }

    @Operation(summary = "Supprimer son compte, confirmé par le mot de passe (ou le code reçu) : effacé dans 14 jours, sauf reconnexion d'ici là")
    @PostMapping("/deletion")
    public ResponseEntity<ApiResponse<AccountDeletionResponse>> requestDeletion(@Valid @RequestBody AccountDeletionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                deletionService.request(getAuthenticatedUserId(), request), "Suppression du compte programmée"));
    }
}
