package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.project.MemberStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private String repositoryUrl;
    private String demoUrl;
    private String logoUrl;
    private UserSummaryResponse owner;
    private List<TagResponse> tags;
    private boolean lookingForContributors;
    private int starsCount;
    private long memberCount;

    // Renseignés uniquement pour un membre connecté
    private Boolean starredByMe;
    private MemberStatus myMembershipStatus;

    private Instant createdAt;
    private Instant updatedAt;
}
