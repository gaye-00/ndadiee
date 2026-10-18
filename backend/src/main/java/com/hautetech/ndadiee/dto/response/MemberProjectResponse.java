package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un projet dont le membre fait partie, avec sa place dans l'équipe : la vitrine de son profil. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberProjectResponse {

    private ProjectResponse project;
    private ProjectRole role;
    // Rôle tenu dans l'équipe (« mobile »), s'il l'a choisi
    private TeamRole specialty;
    // Arrivée dans l'équipe : la création du projet, pour son porteur
    private Instant joinedAt;
}
