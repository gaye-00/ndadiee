package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Le forum en chiffres, et ses tags les plus utilisés (GET /v1/questions/overview). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ForumOverviewResponse {

    private long topics;
    // Avec une réponse acceptée
    private long solved;
    // Encore sans aucune réponse
    private long unanswered;
    private long answers;
    // Membres qui ont publié au moins un sujet ou une réponse
    private long contributors;
    // Les tags qui reviennent le plus dans les sujets, avec leur nombre de sujets
    private List<TagCount> tags;

    public record TagCount(String slug, String name, long topics) {
    }
}
