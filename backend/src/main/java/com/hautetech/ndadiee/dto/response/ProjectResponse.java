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
    private String tagline;
    private String description;
    private String repositoryUrl;
    private String demoUrl;
    private String logoUrl;
    // Adresses complètes (MediaUrls)
    private String coverUrl;
    private String coverThumbnailUrl;
    private String coverCredit;
    private String coverSourceUrl;
    private UserSummaryResponse owner;
    private List<TagResponse> tags;
    private boolean lookingForContributors;
    private int starsCount;
    private long memberCount;

    // Rôles ouverts, et équipe (membres acceptés, le porteur d'abord, 6 au plus) : renseignés par ProjectService
    private List<ProjectOpeningResponse> openings;
    private List<UserSummaryResponse> team;

    // Renseignés uniquement pour un membre connecté
    private Boolean starredByMe;
    private MemberStatus myMembershipStatus;

    private Instant createdAt;
    private Instant updatedAt;
}
