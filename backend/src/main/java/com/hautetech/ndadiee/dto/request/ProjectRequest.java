package com.hautetech.ndadiee.dto.request;

import java.util.List;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * DTO utilisé pour transmettre les informations nécessaires
 * à la création ou à la mise à jour d'un projet.
 *
 * Regroupe les informations générales du projet, ses liens
 * externes, ses visuels, les technologies utilisées, la licence
 * du code et les préférences relatives à la recherche de contributeurs.
 *
 * Les contraintes de validation permettent de vérifier certaines
 * propriétés des données avant leur traitement par l'application.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class ProjectRequest {

    @NotBlank(message = "Le nom du projet est requis")
    @Size(min = 3, max = 100, message = "Le nom doit contenir entre 3 et 100 caractères")
    private String name;

    @Size(max = 200, message = "L'accroche ne peut pas dépasser 200 caractères")
    private String tagline;

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

    // Couverture : capture ou photo, et sa miniature (sinon la couverture sert aussi de miniature)
    @URL(message = "L'URL de la couverture n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String coverUrl;

    @URL(message = "L'URL de la miniature n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String coverThumbnailUrl;

    // Photo empruntée : auteur et licence, et lien vers la source
    @Size(max = 200, message = "Le crédit ne peut pas dépasser 200 caractères")
    private String coverCredit;

    @URL(message = "L'URL de la source n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String coverSourceUrl;

    // Technologies du projet
    @Size(max = 8, message = "8 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;

    // Absent = false
    private Boolean lookingForContributors;

    // Licence du code, identifiant SPDX : « MIT », « Apache-2.0 »
    @Size(max = 40, message = "La licence ne peut pas dépasser 40 caractères")
    private String license;
}
