package com.hautetech.ndadiee.model.project;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

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

/**
 * Demande de retours d'un projet (« Votre avis sur l'écran trajets ») : l'équipe invite la communauté
 * à essayer sa démo et à dire ce qui manque. Chacun y répond une fois (Feedback) ; close, elle n'en
 * reçoit plus.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "feedback_calls")
public class FeedbackCall extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // Le membre de l'équipe qui l'a publiée
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer author;

    @Column(nullable = false, length = 140)
    private String title;

    // Ce que l'équipe demande : « Testez la démo et dites-nous ce qui manque. »
    @Column(length = 500)
    private String prompt;

    @Builder.Default
    @Column(name = "is_open", nullable = false)
    private boolean open = true;
}
