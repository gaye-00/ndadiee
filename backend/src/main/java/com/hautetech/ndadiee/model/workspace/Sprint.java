package com.hautetech.ndadiee.model.workspace;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
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
 * Un sprint de l'équipe (design 3E : « lagos-transit · Sprint 7 ») : un numéro, un objectif, une échéance. Un seul est
 * en cours à la fois (closedAt vide). Le clore range les tâches terminées : elles quittent le tableau et restent
 * comptées comme livrées pendant ce sprint (Task.sprint) ; les autres continuent au sprint suivant.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "sprints",
    uniqueConstraints = @UniqueConstraint(name = "uk_sprints_project_number", columnNames = {"project_id", "number"}),
    // Un seul sprint en cours par projet : un index unique partiel, que JPA ne sait pas décrire (DatabaseConstraints)
    check = @CheckConstraint(name = "ck_sprints_dates", constraint = "ends_at > starts_at")
)
public class Sprint extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // « Sprint 7 » : le suivant du dernier sprint du projet
    @Column(nullable = false)
    private int number;

    // Ce que l'équipe veut livrer : « Notifications de départ »
    @Column(length = 140)
    private String goal;

    @Column(nullable = false)
    private Instant startsAt;

    // L'échéance prévue ; le sprint reste en cours tant que l'équipe ne l'a pas clos
    @Column(nullable = false)
    private Instant endsAt;

    private Instant closedAt;
}
