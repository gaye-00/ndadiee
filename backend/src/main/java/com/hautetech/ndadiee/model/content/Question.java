package com.hautetech.ndadiee.model.content;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.Hideable;
import com.hautetech.ndadiee.model.user.Developer;

import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.Formula;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(name = "questions")
public class Question extends BaseEntity implements Hideable {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    // Markdown
    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    @ManyToMany
    @JoinTable(
        name = "question_tags",
        joinColumns = @JoinColumn(name = "question_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private int viewCount = 0;

    // Somme des votes (+1 / -1)
    @Builder.Default
    @Column(nullable = false)
    private int score = 0;

    @Builder.Default
    @Column(nullable = false)
    private int answerCount = 0;

    @OneToOne(fetch = FetchType.LAZY)
    @ToString.Exclude
    private Answer acceptedAnswer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuestionStatus status = QuestionStatus.OPEN;

    // Masqué par l'administration (voir Hideable) : null tant qu'il est visible
    private Instant hiddenAt;

    @Column(length = 500)
    private String hiddenReason;

    /**
     * Pertinence dans le fil du forum (« Pertinents », sort=hotness) : les votes et les réponses font monter un
     * sujet, les heures qui passent le font redescendre, comme le classement de Hacker News. Un sujet tout neuf
     * passe un moment en tête : c'est là qu'il a besoin de réponses. Calculée par la base à chaque lecture, elle
     * n'est jamais enregistrée.
     */
    @Formula("(score + 2 * answer_count + 1) / power(date_part('epoch', now() - created_at) / 3600 + 2, 1.5)")
    @Setter(AccessLevel.NONE)
    private double hotness;
}
