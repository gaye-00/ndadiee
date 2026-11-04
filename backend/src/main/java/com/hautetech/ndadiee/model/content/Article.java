package com.hautetech.ndadiee.model.content;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
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

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(
    name = "articles",
    uniqueConstraints = @UniqueConstraint(name = "uk_articles_slug", columnNames = "slug"),
    indexes = {
        @Index(name = "idx_articles_author", columnList = "author_id"),
        @Index(name = "idx_articles_status_published_at", columnList = "status, published_at DESC")
    }
)
public class Article extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    // Markdown
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 500)
    private String coverImageUrl;

    @Builder.Default
    @Column(nullable = false)
    private int readingTimeMinutes = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    @ManyToMany
    @JoinTable(
        name = "article_tags",
        joinColumns = @JoinColumn(name = "article_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"),
        indexes = @Index(name = "idx_article_tags_tag", columnList = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Language language = Language.FR;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ArticleStatus status = ArticleStatus.DRAFT;

    // Date de passage à PUBLISHED ; null tant que l'article est un brouillon.
    // Sert au tri : un brouillon publié tardivement ne doit pas apparaître comme ancien.
    private Instant publishedAt;

    // Somme des votes (+1 / -1)
    @Builder.Default
    @Column(nullable = false)
    private int score = 0;

    @Builder.Default
    @Column(nullable = false)
    private int viewCount = 0;
}
