package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.workspace.TaskStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une tâche du tableau, telle que l'équipe l'écrit : à la création comme à la modification, tout ce qui est absent est
 * vide (personne, pas de rôle, pas de PR). La colonne ne se choisit qu'à la création ; ensuite, la tâche se déplace
 * (TaskMoveRequest).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(max = 140, message = "Le titre ne peut pas dépasser 140 caractères")
    private String title;

    @Size(max = 4000, message = "La description ne peut pas dépasser 4000 caractères")
    private String description;

    // Le métier qu'elle demande
    private TeamRole role;

    // Un membre de l'équipe
    @Positive(message = "Membre inconnu")
    private Long assigneeId;

    // Une pull request du projet, par son numéro
    @Positive(message = "Le numéro de pull request doit être positif")
    private Integer pullRequestNumber;

    // À la création seulement : sa colonne (À faire si absente) ; elle arrive en bas
    private TaskStatus status;
}
