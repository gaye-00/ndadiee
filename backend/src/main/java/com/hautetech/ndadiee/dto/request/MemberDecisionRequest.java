package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
