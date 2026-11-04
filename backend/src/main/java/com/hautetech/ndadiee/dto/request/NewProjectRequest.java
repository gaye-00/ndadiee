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
 * Un projet publié d'un seul coup : ce qu'en dit son porteur, et s'il le veut, sa galerie et les rôles qu'il
 * recherche. Tout est créé ensemble, ou rien (ProjectPublishingService).
 */
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
public class NewProjectRequest extends ProjectRequest {

    // Captures et photos, dans l'ordre de la galerie, après la couverture (12 au plus : ProjectMediaService)
    @Valid
    @Size(max = 12, message = "12 images au plus dans la galerie")
    private List<@NotNull(message = "Image manquante") ProjectMediaRequest> gallery;

    // Rôles recherchés : les annonces du projet
    @Valid
    @Size(max = 8, message = "8 rôles au plus")
    private List<@NotNull(message = "Rôle manquant") ProjectOpeningRequest> openings;
}
