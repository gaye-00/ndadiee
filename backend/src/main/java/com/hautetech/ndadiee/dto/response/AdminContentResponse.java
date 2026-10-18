package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.admin.ModeratedContent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un contenu vu du back-office (sujet, réponse ou projet), avec son état de modération. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminContentResponse {

    private ModeratedContent type;
    private Long id;

    // Titre du sujet, nom du projet ; pour une réponse, le titre de son sujet
    private String title;
    private String excerpt;

    // Adresse de la page : le sujet (d'une réponse aussi), ou le projet
    private String slug;

    private UserSummaryResponse author;

    // Score des votes ; étoiles pour un projet
    private int score;

    // Réponses d'un sujet, membres d'un projet ; null pour une réponse
    private Integer replies;

    private boolean hidden;
    private Instant hiddenAt;
    private String hiddenReason;

    private Instant createdAt;
}
