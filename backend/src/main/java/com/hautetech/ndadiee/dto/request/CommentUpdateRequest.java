package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre les données nécessaires
 * à la modification du texte d'un commentaire existant.
 *
 * Le contenu du commentaire doit être renseigné et ne peut
 * pas dépasser 2 000 caractères.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentUpdateRequest {

    @NotBlank(message = "Le commentaire est requis")
    @Size(max = 2000, message = "Le commentaire ne peut pas dépasser 2000 caractères")
    private String body;
}
