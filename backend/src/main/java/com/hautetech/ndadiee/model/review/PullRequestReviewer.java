package com.hautetech.ndadiee.model.review;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Un relecteur d'une pull request (design 3C : « Chinedu · changements demandés, Tunde · approuvé, Wanjiru ·
 * communauté · a commenté »). Requis : l'équipe attend sa revue pour fusionner. Communautaire : il n'est pas de
 * l'équipe du projet. La date de création est celle de la demande ; submittedAt, celle de sa dernière revue.
 *
 * L'équipe peut juger utile la revue d'un relecteur de la communauté (helpfulAt) : elle lui rapporte de la
 * réputation (ReputationRules.REVIEW_HELPFUL).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "pull_request_reviewers",
    uniqueConstraints = @UniqueConstraint(name = "uk_pull_request_reviewers_pr_reviewer", columnNames = {"pull_request_id", "reviewer_id"}),
    indexes = @Index(name = "idx_pull_request_reviewers_reviewer", columnList = "reviewer_id, state")
)
public class PullRequestReviewer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pull_request_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private PullRequest pullRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    @ToString.Exclude
    private Developer reviewer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReviewState state = ReviewState.REQUESTED;

    @Column(nullable = false)
    @Builder.Default
    private boolean required = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean community = false;

    private Instant submittedAt;

    // Revue communautaire jugée utile par l'équipe ; null sinon
    private Instant helpfulAt;
}
