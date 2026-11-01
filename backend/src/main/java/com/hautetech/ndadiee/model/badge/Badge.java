package com.hautetech.ndadiee.model.badge;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "badges", uniqueConstraints = @UniqueConstraint(name = "uk_badges_name", columnNames = "name"))
public class Badge extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String iconUrl;

    // Condition d'obtention, en texte libre (ex. « Première réponse acceptée »)
    @Column(columnDefinition = "TEXT")
    private String criteria;
}
