package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un message à l'équipe : mentions (@ama_owusu), tâches (#38) et `code` s'y écrivent en texte. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamMessageRequest {

    @NotBlank(message = "Le message est vide")
    @Size(max = 2000, message = "Le message ne peut pas dépasser 2000 caractères")
    private String body;
}
