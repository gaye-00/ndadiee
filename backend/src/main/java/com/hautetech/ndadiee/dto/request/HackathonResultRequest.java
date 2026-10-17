package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Résultat d'une équipe au palmarès : sa place, sa distinction, ou les deux ; vides pour les retirer. */
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
