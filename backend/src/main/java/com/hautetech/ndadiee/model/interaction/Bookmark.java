package com.hautetech.ndadiee.model.interaction;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Sujet du forum enregistré par un membre pour y revenir plus tard : sa liste de lecture, dans l'ordre où il les
 * a enregistrés (createdAt). Un seul par membre et par sujet. Le sujet supprimé, l'enregistrement part avec lui.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "bookmarks",
    uniqueConstraints = @UniqueConstraint(name = "uk_bookmarks_user_question", columnNames = {"user_id", "question_id"}),
    indexes = @Index(name = "idx_bookmarks_question", columnList = "question_id")
)
public class Bookmark extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Developer user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Question question;
}
