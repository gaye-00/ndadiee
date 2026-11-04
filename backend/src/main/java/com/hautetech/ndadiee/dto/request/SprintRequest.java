package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un nouveau sprint : son objectif, facultatif, et sa durée en semaines. Il commence tout de suite. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SprintRequest {

    @Size(max = 140, message = "L'objectif ne peut pas dépasser 140 caractères")
    private String goal;

    @NotNull(message = "La durée est requise")
    @Min(value = 1, message = "Un sprint dure au moins une semaine")
    @Max(value = 4, message = "Un sprint dure quatre semaines au plus")
    private Integer weeks;
}
