package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.ContentType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO permettant de transmettre un vote sur un contenu
 * de la plateforme.
 *
 * Identifie le contenu concerné par son type et son identifiant,
 * puis précise la valeur du vote exprimé par l'utilisateur.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VoteRequest {

    @NotNull(message = "Le type de contenu est requis")
    private ContentType targetType;

    @NotNull(message = "L'identifiant du contenu est requis")
    private Long targetId;

    // +1 ou -1
    @NotNull(message = "La valeur du vote est requise")
    @Min(value = -1, message = "La valeur du vote doit être +1 ou -1")
    @Max(value = 1, message = "La valeur du vote doit être +1 ou -1")
    private Integer value;
}
