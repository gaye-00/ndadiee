package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO permettant de traiter une demande d'adhésion à un projet.
 *
 * Contient la décision prise concernant le candidat et, en cas
 * d'acceptation, les rôles qui lui sont attribués dans le projet
 * et au sein de l'équipe.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberDecisionRequest {

    // ACCEPTED ou REJECTED
    @NotNull(message = "La décision est requise")
    private MemberStatus status;

    // Rôle attribué si la demande est acceptée (CONTRIBUTOR par défaut)
    private ProjectRole role;

    // Rôle tenu dans l'équipe : par défaut, celui de l'annonce à laquelle il a répondu
    private TeamRole specialty;
}
