package com.hautetech.ndadiee.model.project;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Rôle recherché par un projet (« annonce ») : un dev mobile, un designer, une relecture en wolof...
 * Pour postuler, on prend son issue « premier pas » quand elle existe.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "project_openings",
    indexes = {
        @Index(name = "idx_project_openings_project", columnList = "project_id"),
        @Index(name = "idx_project_openings_open_role", columnList = "is_open, role")
    },
    check = @CheckConstraint(name = "ck_project_openings_seats", constraint = "seats between 1 and 20")
)
public class ProjectOpening extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // Catégorie du catalogue, pour filtrer et regrouper les annonces
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TeamRole role;

    // Intitulé libre : « Dev mobile React Native », « Mainteneur·e Kotlin »
    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 500)
    private String description;

    // Nombre de personnes recherchées pour ce rôle
    @Builder.Default
    @Column(nullable = false)
    private int seats = 1;

    private Integer starterIssueNumber;

    @Column(length = 200)
    private String starterIssueTitle;

    // Fermée quand le rôle est pourvu : l'annonce reste dans l'historique du projet
    @Builder.Default
    @Column(name = "is_open", nullable = false)
    private boolean open = true;
}
