package com.hautetech.ndadiee.model.content;

import com.hautetech.ndadiee.common.BaseEntity;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * Technologie ou sujet (Java, React, Flutter...). Sert à la fois de tag de contenu
 * (questions, articles, projets, opportunités) et de compétence sur les profils.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(
    name = "tags",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_tags_name", columnNames = "name"),
        @UniqueConstraint(name = "uk_tags_slug", columnNames = "slug")
    }
)
public class Tag extends BaseEntity {

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 60)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private int usageCount = 0;
}
