package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * DTO représentant une demande pour rejoindre un projet.
 *
 * Permet au candidat de préciser l'annonce à laquelle il souhaite
 * postuler et d'ajouter un message de motivation destiné à l'équipe.
 * Ces deux informations sont facultatives.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class JoinProjectRequest {

    private Long openingId;

    @Size(max = 500, message = "Le message ne peut pas dépasser 500 caractères")
    private String motivation;
}
