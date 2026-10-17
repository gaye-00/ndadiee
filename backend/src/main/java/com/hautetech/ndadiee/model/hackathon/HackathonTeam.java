package com.hautetech.ndadiee.model.hackathon;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Équipe d'un hackathon : un projet inscrit par son porteur ou un mainteneur. L'équipe, ce sont les
 * membres du projet ; les rôles qu'elle recherche, ses annonces ouvertes. Une fois le hackathon
 * terminé, l'organisation y inscrit le palmarès : une place (1, 2, 3…) et, ou, une distinction.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "hackathon_teams",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_hackathon_teams_hackathon_project", columnNames = {"hackathon_id", "project_id"}),
        @UniqueConstraint(name = "uk_hackathon_teams_hackathon_rank", columnNames = {"hackathon_id", "rank"})
    }
)
public class HackathonTeam extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Hackathon hackathon;

    // Supprimer le projet retire son équipe des hackathons
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer registeredBy;

    // Ce que l'équipe veut construire pendant le hackathon, en une phrase
    @Column(length = 280)
    private String pitch;

    // Place au palmarès (1 pour le premier prix) ; vide tant que les résultats ne sont pas publiés
    private Integer rank;

    // Distinction sans place : « Prix du public »
    @Column(length = 80)
    private String award;
}
