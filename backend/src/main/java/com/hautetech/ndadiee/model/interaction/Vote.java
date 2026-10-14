package com.hautetech.ndadiee.model.interaction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
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
 * Vote polymorphe : la cible est désignée par (targetType, targetId),
 * sans clé étrangère en base. Un seul vote par personne et par contenu.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "votes",
    uniqueConstraints = @UniqueConstraint(name = "uk_votes_user_target", columnNames = {"user_id", "target_type", "target_id"}),
    indexes = @Index(name = "idx_votes_target", columnList = "target_type, target_id")
)
public class Vote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentType targetType;

    @Column(nullable = false)
    private Long targetId;

    // +1 ou -1
    @Column(nullable = false)
    private int value;
}
