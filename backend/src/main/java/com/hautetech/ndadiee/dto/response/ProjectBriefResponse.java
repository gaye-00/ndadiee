package com.hautetech.ndadiee.dto.response;

import java.util.List;

import com.hautetech.ndadiee.model.project.MemberStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Projet résumé, pour accompagner une annonce : nom, accroche, miniature, dépôt et porteur. */
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
    // L'issue « premier pas » d'une annonce est une issue de ce dépôt
    private String repositoryUrl;
    private UserSummaryResponse owner;

    // Liste des annonces seulement : les technologies du projet, et pour un membre connecté, sa participation
    private List<TagResponse> tags;
    private MemberStatus myMembershipStatus;
}
