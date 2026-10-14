package com.hautetech.ndadiee.model.opportunity;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "opportunities")
public class Opportunity extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String companyName;

    @Column(length = 500)
    private String companyLogoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OpportunityType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkMode workMode;

    // Code pays ISO 3166-1 alpha-2 (SN, CI, NG, KE...)
    @Column(length = 2)
    private String country;

    private String city;

    // Texte libre
    private String salaryRange;

    @Column(length = 500)
    private String applyUrl;

    private LocalDate deadline;

    // User et non Developer : un Admin peut aussi publier une opportunité
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private User postedBy;

    @ManyToMany
    @JoinTable(
        name = "opportunity_tags",
        joinColumns = @JoinColumn(name = "opportunity_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
