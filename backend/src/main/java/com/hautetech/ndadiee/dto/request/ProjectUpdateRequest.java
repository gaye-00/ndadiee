package com.hautetech.ndadiee.dto.request;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Un projet modifié depuis son formulaire (/projects/{slug}/edit) : ce qu'en dit son porteur, et s'il l'envoie, sa
 * galerie telle qu'elle doit être, dans l'ordre. Sans galerie (null), elle ne change pas. Les rôles recherchés se
 * gèrent dans l'espace d'équipe.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
public class ProjectUpdateRequest extends ProjectRequest {

    // Les images déjà dans la galerie se reconnaissent à leur adresse : gardées (légende et rang mis à jour), les
    // autres retirées, les nouvelles ajoutées
    @Valid
    @Size(max = 12, message = "12 images au plus dans la galerie")
    private List<@NotNull(message = "Image manquante") ProjectMediaRequest> gallery;
}
