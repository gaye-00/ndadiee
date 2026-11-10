package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un fichier du code d'un projet : son texte, ou pourquoi il ne s'affiche pas (binaire, trop gros). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectCodeFileResponse {

    private String path;
    // En octets
    private long size;

    // Le texte du fichier ; null s'il est binaire ou trop gros pour être affiché
    private String content;
    private boolean binary;
    private boolean tooLarge;

    // Le fichier sur GitHub, et son contenu brut (une image s'y affiche) ; null pour un dépôt de démonstration
    private String webUrl;
    private String rawUrl;
}
