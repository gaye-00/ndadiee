package com.hautetech.ndadiee.model.project;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.CheckConstraint;
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

/** Retour d'un membre sur une demande de retours : une note de 1 à 5, facultative, et ce qu'il en pense. */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "feedback",
    uniqueConstraints = @UniqueConstraint(name = "uk_feedback_call_author", columnNames = {"call_id", "author_id"}),
    check = @CheckConstraint(name = "ck_feedback_rating", constraint = "rating between 1 and 5")
)
public class Feedback extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private FeedbackCall call;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    // De 1 à 5
    private Integer rating;

    @Column(nullable = false, length = 1000)
    private String body;
}
