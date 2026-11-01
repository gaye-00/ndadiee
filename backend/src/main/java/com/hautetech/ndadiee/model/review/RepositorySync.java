package com.hautetech.ndadiee.model.review;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Où en est la synchronisation des pull requests d'un projet avec son dépôt GitHub (PullRequestSyncService) : le
 * dépôt lu, la dernière tentative, la dernière réussite, et l'erreur de la dernière tentative s'il y en a eu une.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "repository_syncs")
public class RepositorySync extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // L'identifiant GitHub du dépôt : il ne change pas quand le dépôt est renommé ou transféré
    @Column(length = 100)
    private String repositoryId;

    // « owner/name », tels que GitHub les écrit
    @Column(length = 140)
    private String fullName;

    private Instant attemptedAt;

    private Instant syncedAt;

    // Le code d'erreur de la dernière tentative (GITHUB_REPOSITORY_NOT_FOUND, GITHUB_RATE_LIMITED…), null si elle a réussi
    @Column(length = 40)
    private String error;
}
