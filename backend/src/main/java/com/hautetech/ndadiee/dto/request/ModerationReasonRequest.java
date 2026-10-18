package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Le motif d'une décision de l'administration (suspendre un compte, masquer un contenu). Il est gardé au journal,
 * et montré à la personne concernée : le titulaire du compte à sa connexion, l'auteur sur son contenu masqué.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ModerationReasonRequest {

    @NotBlank(message = "Le motif est requis")
    @Size(max = 500, message = "Le motif ne peut pas dépasser 500 caractères")
    private String reason;
}
