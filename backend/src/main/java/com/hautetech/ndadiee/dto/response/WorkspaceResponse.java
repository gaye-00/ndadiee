package com.hautetech.ndadiee.dto.response;

import java.util.List;

import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * L'espace d'équipe d'un projet (design 3E) : le projet, l'équipe et qui est là, le sprint en cours, et ce que montrent
 * les onglets. Réservé aux membres de l'équipe.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WorkspaceResponse {

    private ProjectBriefResponse project;

    // Le membre connecté : sa place, son métier, et s'il gère l'équipe (porteur, mainteneur)
    private ProjectRole myRole;
    private TeamRole mySpecialty;
    private boolean canManage;

    // Le porteur, puis les mainteneurs, puis dans l'ordre d'arrivée
    private List<WorkspaceMemberResponse> members;

    // Le sprint en cours ; null entre deux sprints. Le prochain portera le numéro lastSprintNumber + 1.
    private SprintResponse sprint;
    private int lastSprintNumber;

    // Les onglets : PR ouvertes, rôles recherchés, candidatures à étudier (pour qui gère l'équipe, sinon 0)
    private long openPullRequests;
    private long openRoles;
    private long pendingApplications;
}
