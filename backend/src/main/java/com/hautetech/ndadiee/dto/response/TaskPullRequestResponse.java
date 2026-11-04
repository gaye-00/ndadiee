package com.hautetech.ndadiee.dto.response;

import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewState;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une pull request du projet, vue d'une tâche : son numéro, son titre, son état, et où en est sa revue. Aussi la liste
 * des PR qu'une tâche peut livrer.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskPullRequestResponse {

    private int number;
    private String title;
    private PullRequestStatus status;
    private boolean draft;
    /**
     * Le verdict des relecteurs, pour une PR ouverte : CHANGES_REQUESTED si l'un d'eux en demande, APPROVED si aucune
     * revue requise n'attend plus et qu'au moins un a approuvé, REQUESTED tant qu'une revue est attendue ; null sans
     * relecteur.
     */
    private ReviewState review;
    // Sur GitHub ; null pour les données de démonstration
    private String githubUrl;
}
