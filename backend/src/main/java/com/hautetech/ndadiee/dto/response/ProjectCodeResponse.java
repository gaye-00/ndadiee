package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Le code d'un projet, à parcourir sans quitter Ndadiee : d'où il vient, sa branche, et l'arbre de ses fichiers.
 * Le contenu d'un fichier se demande à part (ProjectCodeFileResponse).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectCodeResponse {

    /** GITHUB : un dépôt public, lu sur GitHub ; DEMO : un dépôt de démonstration, fourni avec l'application */
    public enum Source {
        GITHUB, DEMO
    }

    private Source source;

    // « owner/name » sur GitHub, « ndadiee-demo/lagos-transit » pour un dépôt de démonstration
    private String repository;
    private String branch;

    // La branche sur GitHub ; null pour un dépôt de démonstration
    private String webUrl;

    // Les dossiers et les fichiers, par ordre de chemin
    private List<ProjectCodeEntry> entries;

    // Le dépôt a plus d'entrées que celles listées : le reste se lit sur GitHub
    private boolean truncated;
}
