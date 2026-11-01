package com.hautetech.ndadiee.model.user;

import java.util.HashSet;
import java.util.Set;

import com.hautetech.ndadiee.model.content.Tag;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Membre de la communauté (rôle USER ou MODERATOR) : profil public, réputation,
 * compétences et abonnements.
 *
 * Héritage SINGLE_TABLE : ces colonnes sont vides pour les lignes Admin, elles
 * doivent donc rester nullable en base.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@DiscriminatorValue("developer")
public class Developer extends User {

    @Column(columnDefinition = "TEXT")
    private String bio;

    // Code pays ISO 3166-1 alpha-2 (SN, CI, NG, KE...)
    @Column(length = 2)
    private String country;

    private String city;

    @Column(length = 500)
    private String githubUrl;

    @Column(length = 500)
    private String linkedinUrl;

    @Column(length = 500)
    private String websiteUrl;

    @Builder.Default
    private int reputation = 0;

    @Enumerated(EnumType.STRING)
    private ExperienceLevel level;

    @Builder.Default
    private boolean openToWork = false;

    @ManyToMany
    @JoinTable(
        name = "user_skills",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"),
        indexes = @Index(name = "idx_user_skills_tag", columnList = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> skills = new HashSet<>();

    // Tags suivis : alimentent le fil personnalisé (/feed)
    @ManyToMany
    @JoinTable(
        name = "user_followed_tags",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"),
        indexes = @Index(name = "idx_user_followed_tags_tag", columnList = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> followedTags = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "user_follows",
        joinColumns = @JoinColumn(name = "follower_id"),
        inverseJoinColumns = @JoinColumn(name = "following_id"),
        indexes = @Index(name = "idx_user_follows_following", columnList = "following_id"),
        check = @CheckConstraint(name = "ck_user_follows_not_self", constraint = "follower_id <> following_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Developer> following = new HashSet<>();

    @ManyToMany(mappedBy = "following")
    @ToString.Exclude
    @Builder.Default
    private Set<Developer> followers = new HashSet<>();
}
