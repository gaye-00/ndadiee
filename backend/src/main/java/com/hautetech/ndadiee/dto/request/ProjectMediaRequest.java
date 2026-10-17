package com.hautetech.ndadiee.dto.request;

import org.hibernate.validator.constraints.URL;

import com.hautetech.ndadiee.model.project.MediaKind;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Image ajoutée à la galerie d'un projet. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectMediaRequest {

    @NotNull(message = "Le type d'image est requis")
    private MediaKind kind;

    @NotBlank(message = "L'adresse de l'image est requise")
    @URL(message = "L'adresse de l'image n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String url;

    @URL(message = "L'adresse de la miniature n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String thumbnailUrl;

    @Size(max = 200, message = "La légende ne peut pas dépasser 200 caractères")
    private String caption;

    // Image empruntée : auteur et licence, et lien vers la source
    @Size(max = 200, message = "Le crédit ne peut pas dépasser 200 caractères")
    private String credit;

    @URL(message = "L'URL de la source n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String sourceUrl;

    @Positive(message = "La largeur doit être positive")
    private Integer width;

    @Positive(message = "La hauteur doit être positive")
    private Integer height;
}
