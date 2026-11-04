package com.hautetech.ndadiee.dto.request;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre les informations d'un temps fort
 * du calendrier d'un hackathon.
 *
 * Chaque temps fort est défini par une date et une heure planifiées,
 * ainsi que par un intitulé permettant de l'identifier.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonMilestoneRequest {

    @NotNull(message = "L'heure du temps fort est requise")
    private Instant scheduledAt;

    @NotBlank(message = "L'intitulé du temps fort est requis")
    @Size(max = 120, message = "L'intitulé ne peut pas dépasser 120 caractères")
    private String label;
}
