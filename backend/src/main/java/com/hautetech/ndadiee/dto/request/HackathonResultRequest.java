package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre les informations d'un résultat
 * d'équipe dans le palmarès d'un hackathon.
 *
 * Permet de renseigner le classement de l'équipe, la distinction
 * obtenue, ou les deux. Les champs laissés vides peuvent servir
 * à retirer les informations correspondantes, selon la logique
 * de traitement appliquée par le service.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonResultRequest {

    @Min(value = 1, message = "La place commence à 1")
    @Max(value = 10, message = "Le palmarès compte 10 places au plus")
    private Integer rank;

    @Size(max = 80, message = "La distinction ne peut pas dépasser 80 caractères")
    private String award;
}
