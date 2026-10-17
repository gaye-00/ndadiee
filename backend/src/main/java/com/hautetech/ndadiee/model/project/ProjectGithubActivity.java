package com.hautetech.ndadiee.model.project;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Activité du dépôt GitHub d'un projet, relevée à la dernière synchronisation (design 3D : « 34 commits
 * cette semaine »). Un relevé par projet, remplacé à chaque synchronisation (GithubActivityService).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "project_github_activity")
public class ProjectGithubActivity extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    private int stars;

    private int forks;

    private int openIssues;

    // Issues ouvertes étiquetées « good first issue » : les « premier pas »
    private int goodFirstIssues;

    private int contributors;

    // Commits des 12 dernières semaines, de la plus ancienne à la semaine en cours
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    @Builder.Default
    private List<Integer> commitWeeks = new ArrayList<>();

    // Dernière release : son tag (« v0.7 ») et sa date
    @Column(length = 40)
    private String lastRelease;

    private Instant lastReleaseAt;

    private Instant lastCommitAt;

    @Column(nullable = false)
    private Instant syncedAt;
}
