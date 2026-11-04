package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.workspace.TaskStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une tâche du tableau de l'équipe (design 3E : « #38 Mode hors-ligne · mobile · Tunde · en cours depuis 2 jours »). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskResponse {

    private Long id;
    private int number;
    private String title;
    private String description;
    private TaskStatus status;
    // Sa place dans la colonne, de 0 en haut
    private int position;
    private TeamRole role;
    // Personne tant qu'elle attend preneur
    private UserSummaryResponse assignee;
    private UserSummaryResponse author;
    // La pull request qui la livre, avec où en est sa revue
    private TaskPullRequestResponse pullRequest;
    // Arrivée dans sa colonne, et qui l'y a mise (personne : elle y est depuis sa création)
    private Instant statusChangedAt;
    private UserSummaryResponse movedBy;
    // Livrée pendant ce sprint, clos depuis : elle a quitté le tableau
    private Integer deliveredInSprint;
    private Instant createdAt;
    private Instant updatedAt;
}
