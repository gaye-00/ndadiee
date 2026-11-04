package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO utilisé pour transmettre l'avis d'un utilisateur
 * concernant une demande de feedback.
 *
 * L'utilisateur peut attribuer une note facultative de 1 à 5
 * et doit obligatoirement fournir un commentaire.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeedbackRequest {

    @Min(value = 1, message = "La note va de 1 à 5")
    @Max(value = 5, message = "La note va de 1 à 5")
    private Integer rating;

    @NotBlank(message = "Votre avis est requis")
    @Size(max = 1000, message = "Votre avis ne peut pas dépasser 1000 caractères")
    private String body;
}
