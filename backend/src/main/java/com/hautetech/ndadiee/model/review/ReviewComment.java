package com.hautetech.ndadiee.model.review;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "review_comments")
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

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    // Sur une ligne du diff : le fichier et la ligne ; sinon, dans la conversation
    @Column(length = 300)
    private String path;

    private Integer line;

    // Le code proposé à la place de la ligne
    @Column(columnDefinition = "TEXT")
    private String suggestion;
}
