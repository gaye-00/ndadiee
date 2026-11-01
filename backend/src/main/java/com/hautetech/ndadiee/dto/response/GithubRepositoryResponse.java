package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un dépôt GitHub public, prêt à préremplir le formulaire d'un projet. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GithubRepositoryResponse {

    // Compte propriétaire (« ada-lovelace ») et sa photo
    private String owner;
    private String ownerAvatarUrl;
    private String name;
    // « owner/name »
    private String fullName;
    // Adresse du dépôt, sous sa forme canonique : https://github.com/owner/name
    private String repositoryUrl;
    private String description;
    // Site du projet, adresse complète (https:// ajouté s'il manquait), null s'il n'est pas valide
    private String homepage;
    // Licence reconnue par GitHub, identifiant SPDX (« MIT ») ; null si aucune ou non reconnue
    private String license;
    // Langages, le plus présent d'abord (6 au plus)
    private List<String> languages;
    private List<String> topics;
    // Technologies proposées pour le projet : langages principaux puis sujets du dépôt, sous le nom des tags déjà
    // connus de la plateforme quand il y en a (8 au plus)
    private List<String> suggestedTags;
    // L'introduction du README, en paragraphes et listes ; null sans README exploitable
    private String readmeExcerpt;
    private int stars;
    private int forks;
    private int openIssues;
    private boolean archived;
    private boolean fork;
    private Instant pushedAt;
    // Un projet de la vitrine pointe déjà vers ce dépôt : son slug
    private String listedProjectSlug;
}
