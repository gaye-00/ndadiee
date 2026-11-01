package com.hautetech.ndadiee.model.project;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.Hideable;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.user.Developer;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@DynamicUpdate
@Table(
    name = "projects",
    uniqueConstraints = @UniqueConstraint(name = "uk_projects_slug", columnNames = "slug"),
    indexes = {
        @Index(name = "idx_projects_owner", columnList = "owner_id"),
        @Index(name = "idx_projects_created_at", columnList = "created_at DESC"),
        @Index(name = "idx_projects_stars", columnList = "stars_count DESC"),
        @Index(name = "idx_projects_hidden", columnList = "hidden_at", options = "where hidden_at is not null")
    }
)
public class Project extends BaseEntity implements Hideable {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    // Accroche d'une ligne, pour les cartes de la vitrine
    @Column(length = 200)
    private String tagline;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String repositoryUrl;

    @Column(length = 500)
    private String demoUrl;

    @Column(length = 500)
    private String logoUrl;

    // Couverture (capture ou photo) et sa miniature. Adresse complète, ou chemin d'un média servi
    // par l'API (« media/... ») : voir MediaUrls.
    @Column(length = 500)
    private String coverUrl;

    @Column(length = 500)
    private String coverThumbnailUrl;

    // Crédit d'une photo empruntée (auteur et licence), et lien vers sa source
    @Column(length = 200)
    private String coverCredit;

    @Column(length = 500)
    private String coverSourceUrl;

    // Licence du code, identifiant SPDX (« MIT », « Apache-2.0 ») : « open source · MIT »
    @Column(length = 40)
    private String license;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer owner;

    // Technologies du projet
    @ManyToMany
    @JoinTable(
        name = "project_tags",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"),
        indexes = @Index(name = "idx_project_tags_tag", columnList = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private boolean lookingForContributors = false;

    @Builder.Default
    @Column(nullable = false)
    private int starsCount = 0;

    // Masqué par l'administration (voir Hideable) : null tant qu'il est visible
    private Instant hiddenAt;

    @Column(length = 500)
    private String hiddenReason;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<ProjectMember> members = new ArrayList<>();

    // Rôles recherchés, ouverts ou pourvus
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<ProjectOpening> openings = new ArrayList<>();
}
