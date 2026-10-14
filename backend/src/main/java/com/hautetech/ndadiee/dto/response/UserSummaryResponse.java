package com.hautetech.ndadiee.dto.response;

import com.hautetech.ndadiee.model.user.ExperienceLevel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserSummaryResponse {

    private Long id;
    private String username;
    private String fullName;
    private String avatarUrl;

    // Les champs suivants sont null pour un compte Admin
    private String country;
    private Integer reputation;
    private ExperienceLevel level;
}
