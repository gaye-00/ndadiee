package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Projet résumé, pour accompagner une annonce : nom, accroche, miniature et porteur. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectBriefResponse {

    private Long id;
    private String name;
    private String slug;
    private String tagline;
    private String coverThumbnailUrl;
    private UserSummaryResponse owner;
}
