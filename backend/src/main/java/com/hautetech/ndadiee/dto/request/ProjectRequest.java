package com.hautetech.ndadiee.dto.request;

import java.util.List;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectRequest {

    @NotBlank(message = "Le nom du projet est requis")
    @Size(min = 3, max = 100, message = "Le nom doit contenir entre 3 et 100 caractères")
    private String name;

    @NotBlank(message = "La description est requise")
    @Size(max = 10000, message = "La description ne peut pas dépasser 10000 caractères")
    private String description;

    @URL(message = "L'URL du dépôt n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String repositoryUrl;

    @URL(message = "L'URL de la démo n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String demoUrl;

    @URL(message = "L'URL du logo n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String logoUrl;

    // Technologies du projet
    @Size(max = 8, message = "8 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;

    // Absent = false
    private Boolean lookingForContributors;
}
