package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre les informations nécessaires
 * à l'inscription d'un projet comme équipe participante
 * à un hackathon.
 *
 * Le projet est identifié par son ID et peut être accompagné
 * d'un pitch présentant l'idée que l'équipe souhaite développer.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonTeamRequest {

    @NotNull(message = "Le projet est requis")
    private Long projectId;

    // Ce que l'équipe veut construire pendant le hackathon
    @Size(max = 280, message = "Le pitch ne peut pas dépasser 280 caractères")
    private String pitch;
}
