package com.hautetech.ndadiee.model.content;

import java.time.Instant;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.Hideable;
import com.hautetech.ndadiee.model.user.Developer;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
@DynamicUpdate
@Table(name = "answers")
public class Answer extends BaseEntity implements Hideable {

    // Markdown
    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    // Somme des votes (+1 / -1)
    @Builder.Default
    @Column(nullable = false)
    private int score = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean accepted = false;

    // Masqué par l'administration (voir Hideable) : null tant qu'il est visible
    private Instant hiddenAt;

    @Column(length = 500)
    private String hiddenReason;
}
