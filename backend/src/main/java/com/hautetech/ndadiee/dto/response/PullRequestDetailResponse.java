package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * La page d'une revue de code (design 3C) : la pull request telle que la liste la montre, sa description, sa
 * conversation et ses commentaires de ligne, et ce que le membre connecté peut y faire.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestDetailResponse {

    private PullRequestResponse pullRequest;
    // Description, en Markdown ; null si l'auteur n'en a pas écrit
    private String body;
    // Commentaires de la conversation et des lignes, et revues rendues : les plus anciens d'abord
    private List<ReviewCommentResponse> comments;
    private Viewer viewer;
    // Réputation que rapporte une revue communautaire jugée utile (ReputationRules.REVIEW_HELPFUL)
    private int helpfulReward;

    /** Ce que le membre connecté peut faire de la PR. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Viewer {
        // Il l'a ouverte
        private boolean author;
        // Commenter la conversation ou une ligne : l'auteur, l'équipe, les relecteurs, tous si elle est communautaire
        private boolean canComment;
        // Rendre une revue : la PR est ouverte et prête, il n'en est pas l'auteur, et il est de l'équipe, relecteur,
        // ou elle est communautaire
        private boolean canReview;
        // Se proposer comme relecteur, ou se retirer d'une revue qu'il a prise et pas encore commencée
        private boolean canClaim;
        private boolean canRelease;
        // Juger utile la revue d'un relecteur de la communauté : l'équipe du projet
        private boolean canJudge;
    }
}
