package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.workspace.TaskStatus;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une tâche glissée ailleurs sur le tableau : sa colonne, et sa place dans la colonne (0 en haut). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskMoveRequest {

    @NotNull(message = "La colonne est requise")
    private TaskStatus status;

    // Au-delà de la dernière place, la tâche va en bas de la colonne
    @NotNull(message = "La place est requise")
    @Min(value = 0, message = "La place commence à 0")
    private Integer position;
}
