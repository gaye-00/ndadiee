package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.AdminTargetType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une ligne du journal de l'administration. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminActionResponse {

    private Long id;

    // null si le compte d'administration a été supprimé depuis
    private UserSummaryResponse admin;

    private AdminActionType action;
    private AdminTargetType targetType;
    private Long targetId;
    private String targetLabel;
    private String reason;
    private String detail;
    private Instant createdAt;
}
