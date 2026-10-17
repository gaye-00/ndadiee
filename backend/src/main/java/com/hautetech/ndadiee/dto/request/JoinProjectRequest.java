package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Candidature à un projet : le rôle visé (une de ses annonces ouvertes) et un mot pour l'équipe, facultatifs. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class JoinProjectRequest {

    private Long openingId;

    @Size(max = 500, message = "Le message ne peut pas dépasser 500 caractères")
    private String motivation;
}
