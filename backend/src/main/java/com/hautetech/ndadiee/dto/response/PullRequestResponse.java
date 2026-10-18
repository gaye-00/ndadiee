package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.review.PullRequestStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une pull request dans la liste des revues (design 3B et 3C) : son projet, son auteur, ses branches, le diff en
 * chiffres, ses vérifications, ses relecteurs ; et pour le membre connecté, sa propre revue et pourquoi elle lui
 * est proposée.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestResponse {

    private Long id;
    private int number;
    private String title;
    private PullRequestStatus status;
    private boolean draft;
    private boolean community;
    private List<String> labels;

    private ProjectBriefResponse project;
    private UserSummaryResponse author;
    // Sa première PR dans ce projet (design 3C : « sa 1re contribution »)
    private boolean firstContribution;
    private Integer starterIssueNumber;

    private String sourceBranch;
    private String targetBranch;
    private int commits;
    private int filesChanged;
    private int additions;
    private int deletions;

    // Vérifications : réussies, en échec ; les autres tournent encore
    private int checksTotal;
    private int checksPassed;
    private int checksFailed;

    // Les requis d'abord, puis dans l'ordre des demandes
    private List<ReviewerResponse> reviewers;
    private long commentCount;

    private Instant createdAt;
    private Instant lastActivityAt;
    private Instant mergedAt;
    private Instant closedAt;

    // Pour le membre connecté : sa revue (null s'il n'est pas relecteur), s'il est de l'équipe du projet, les
    // technologies de la PR qu'il a dans son profil, et la réputation qu'une revue utile lui rapporterait
    private ReviewerResponse myReview;
    private boolean inMyTeam;
    private List<String> sharedSkills;
    private Integer reward;
}
