package com.hautetech.ndadiee.model.review;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
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
 * Une pull request d'un projet, à relire (design 3C : « #84 Cache Redis pour les horaires BRT · Ama Owusu veut
 * fusionner 6 commits de feat/redis-cache vers main »). Son numéro est celui du dépôt ; le diff en chiffres et les
 * vérifications sont ceux de la dernière synchronisation.
 *
 * Une PR « communautaire » s'ouvre aux relecteurs hors de l'équipe : chaque revue jugée utile leur rapporte de la
 * réputation (ReputationRules.REVIEW_HELPFUL).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "pull_requests",
    uniqueConstraints = @UniqueConstraint(name = "uk_pull_requests_project_number", columnNames = {"project_id", "number"})
)
public class PullRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // Le numéro dans le dépôt : « #84 »
    @Column(nullable = false)
    private int number;

    @Column(nullable = false, length = 200)
    private String title;

    // Description, en Markdown
    @Column(columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    private Developer author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PullRequestStatus status = PullRequestStatus.OPEN;

    // Brouillon : pas encore prête à relire
    @Column(nullable = false)
    @Builder.Default
    private boolean draft = false;

    // Ouverte aux relecteurs hors de l'équipe
    @Column(nullable = false)
    @Builder.Default
    private boolean community = false;

    @Column(nullable = false, length = 120)
    private String sourceBranch;

    @Column(nullable = false, length = 120)
    private String targetBranch;

    // Le diff : commits, fichiers modifiés, lignes ajoutées et supprimées
    @Column(nullable = false)
    private int commits;

    @Column(nullable = false)
    private int filesChanged;

    @Column(nullable = false)
    private int additions;

    @Column(nullable = false)
    private int deletions;

    // Vérifications automatiques (tests, lint, build) : réussies, en échec ; les autres tournent encore
    @Column(nullable = false)
    private int checksTotal;

    @Column(nullable = false)
    private int checksPassed;

    @Column(nullable = false)
    private int checksFailed;

    // L'issue « premier pas » qu'elle résout, s'il y en a une
    private Integer starterIssueNumber;

    // Étiquettes du dépôt : « go », « redis »
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    @Builder.Default
    private List<String> labels = new ArrayList<>();

    private Instant mergedAt;
    private Instant closedAt;

    // Dernier signe de vie : commit, revue ou commentaire
    @Column(nullable = false)
    private Instant lastActivityAt;
}
