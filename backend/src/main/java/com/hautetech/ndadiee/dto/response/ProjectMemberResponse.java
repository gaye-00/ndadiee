package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectMemberResponse {

    private Long id;
    private UserSummaryResponse user;
    private ProjectRole role;
    private MemberStatus status;
    // Rôle tenu dans l'équipe (« mobile ») et annonce à laquelle il a répondu
    private TeamRole specialty;
    private Long openingId;
    // Le mot de sa candidature : seulement pour le porteur et les mainteneurs
    private String motivation;
    private Instant createdAt;
}
