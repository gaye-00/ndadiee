package com.hautetech.ndadiee.dto.request;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Les réglages d'un projet depuis son espace d'équipe : son dépôt (vide : aucun) et s'il recrute. Le reste du projet
 * (textes, images, technologies) ne change pas.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectSettingsRequest {

    @URL(message = "L'URL du dépôt n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String repositoryUrl;

    @NotNull(message = "Dis si le projet recrute")
    private Boolean lookingForContributors;
}
