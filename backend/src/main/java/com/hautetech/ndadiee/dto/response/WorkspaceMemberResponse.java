package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un membre de l'équipe, dans son espace : sa place, son métier, et s'il est là en ce moment. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WorkspaceMemberResponse {

    // La participation (ProjectMember) : pour la modifier depuis les réglages
    private Long memberId;
    private UserSummaryResponse user;
    private ProjectRole role;
    private TeamRole specialty;
    private Instant joinedAt;
    private boolean online;
}
