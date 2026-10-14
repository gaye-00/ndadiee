package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;

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
    private Instant createdAt;
}
