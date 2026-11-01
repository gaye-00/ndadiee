package com.hautetech.ndadiee.model.workspace;

import java.time.Instant;

import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.CheckConstraint;
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
 * Une tâche du tableau de l'équipe (design 3E : « #38 Mode hors-ligne · mobile · Tunde »).
 *
 * Son numéro suit ceux du projet et ne change jamais : on l'écrit « #38 » dans la discussion. Elle avance de colonne
 * en colonne (status), à sa place dans la colonne (position, de 0 en haut). Elle peut porter le métier qu'elle demande
 * (un rôle du catalogue : ses couleurs sur la carte), la personne qui s'en charge et la pull request qui la livre.
 * Terminée, elle quitte le tableau à la clôture du sprint, qui la compte comme livrée (sprint).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(
    name = "tasks",
    uniqueConstraints = @UniqueConstraint(name = "uk_tasks_project_number", columnNames = {"project_id", "number"}),
    indexes = {
        @Index(name = "idx_tasks_board", columnList = "project_id, sprint_id, status, position"),
        @Index(name = "idx_tasks_assignee", columnList = "assignee_id")
    },
    check = @CheckConstraint(name = "ck_tasks_position", constraint = "position >= 0")
)
public class Task extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // « #38 » : le suivant de la dernière tâche du projet
    @Column(nullable = false)
    private int number;

    @Column(nullable = false, length = 140)
    private String title;

    // Le détail, en Markdown léger
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    // Sa place dans la colonne, de 0 en haut ; les places d'une colonne se suivent sans trou
    @Column(nullable = false)
    private int position;

    // Le métier qu'elle demande : « mobile », « design »
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TeamRole role;

    // Le membre qui s'en charge ; personne tant qu'elle attend preneur
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    @ToString.Exclude
    private Developer assignee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    private Developer author;

    // La pull request qui la livre. Une PR de GitHub peut disparaître (dépôt changé) : le lien tombe, la tâche reste.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pull_request_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private PullRequest pullRequest;

    // Arrivée dans sa colonne (« en cours depuis 2 jours »), et qui l'y a mise
    @Column(nullable = false)
    private Instant statusChangedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moved_by_id")
    @ToString.Exclude
    private Developer movedBy;

    // Le sprint clos pendant lequel elle a été livrée ; vide tant qu'elle est au tableau
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private Sprint sprint;
}
