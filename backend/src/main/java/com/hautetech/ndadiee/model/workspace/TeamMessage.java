package com.hautetech.ndadiee.model.workspace;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Un message de la discussion de l'équipe (« # équipe », design 3E), réservée à ses membres.
 *
 * Un message peut aussi être un rendez-vous (kind EVENT) : son texte est alors son titre (« Pair programming : cache
 * Redis »), avec son heure, sa fin et le lien de l'appel. Le prochain rendez-vous reste épinglé en haut de la
 * discussion ; chacun dit s'il y sera (TeamEventAttendee).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "team_messages",
    indexes = {
        @Index(name = "idx_team_messages_project", columnList = "project_id, id"),
        @Index(name = "idx_team_messages_events", columnList = "project_id, event_ends_at")
    },
    // Un rendez-vous a son début, et sa fin après son début
    check = @CheckConstraint(name = "ck_team_messages_event",
        constraint = "kind = 'MESSAGE' or (event_starts_at is not null and event_ends_at > event_starts_at)")
)
public class TeamMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    private Developer author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TeamMessageKind kind = TeamMessageKind.MESSAGE;

    // Le message, ou le titre du rendez-vous. Mentions (@ama_owusu), tâches (#38) et `code` s'y écrivent en texte.
    @Column(nullable = false, length = 2000)
    private String body;

    // ─── Un rendez-vous seulement ───

    private Instant eventStartsAt;

    private Instant eventEndsAt;

    // L'appel où se retrouver (Meet, Jitsi…)
    @Column(length = 500)
    private String eventLink;
}
