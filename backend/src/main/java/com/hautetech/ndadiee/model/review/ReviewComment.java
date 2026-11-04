package com.hautetech.ndadiee.model.review;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
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
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Un commentaire de revue : sur la conversation, ou sur une ligne d'un fichier du diff, avec une suggestion de code
 * à appliquer (design 3C : « Expiration à 0 : les horaires ne seront jamais rafraîchis… SUGGESTION »).
 *
 * Une revue rendue est aussi un commentaire : il porte son verdict (commentée, approuvée, changements demandés) et
 * son message, facultatif. Un commentaire a donc un texte, un verdict, ou les deux.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "review_comments",
    indexes = @Index(name = "idx_review_comments_pull_request", columnList = "pull_request_id, created_at"),
    check = {
        // Un texte, un verdict, ou les deux : jamais ni l'un ni l'autre
        @CheckConstraint(name = "ck_review_comments_content", constraint = "body is not null or verdict is not null"),
        // Le verdict d'une revue rendue : jamais « demandée »
        @CheckConstraint(name = "ck_review_comments_verdict", constraint = "verdict is null or verdict <> 'REQUESTED'")
    }
)
public class ReviewComment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pull_request_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private PullRequest pullRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    private Developer author;

    // Le texte, en Markdown ; null pour un verdict rendu sans message
    @Column(columnDefinition = "TEXT")
    private String body;

    // Le verdict d'une revue rendue (jamais REQUESTED) ; null pour un simple commentaire
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReviewState verdict;

    // Sur une ligne du diff : le fichier et la ligne ; sinon, dans la conversation
    @Column(length = 300)
    private String path;

    private Integer line;

    // Le code proposé à la place de la ligne
    @Column(columnDefinition = "TEXT")
    private String suggestion;
}
