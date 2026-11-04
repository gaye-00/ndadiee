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
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Commentaire polymorphe : la cible est désignée par (targetType, targetId),
 * sans clé étrangère en base.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "comments",
    indexes = {
        @Index(name = "idx_comments_target", columnList = "target_type, target_id"),
        @Index(name = "idx_comments_author", columnList = "author_id")
    }
)
public class Comment extends BaseEntity {

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentType targetType;

    @Column(nullable = false)
    private Long targetId;
}
