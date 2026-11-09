package com.hautetech.ndadiee.model.user;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Le code envoyé par e-mail pour prouver une adresse, le temps qu'il soit saisi : un seul à la fois par compte, un
 * nouveau remplace l'ancien. Seule son empreinte est gardée ; saisi juste, il disparaît avec cette ligne.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "email_verifications",
    uniqueConstraints = @UniqueConstraint(name = "uk_email_verifications_user", columnNames = "user_id")
)
public class EmailVerification extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    // Le compte supprimé (inscription jamais confirmée) emporte son code
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private User user;

    // Empreinte BCrypt du code à 6 chiffres : le code lui-même n'est jamais enregistré
    @Column(nullable = false, length = 100)
    private String codeHash;

    @Column(nullable = false)
    private Instant expiresAt;

    // Essais faux sur ce code : au-delà de la limite, il faut en demander un autre
    private int attempts;

    // Dernier envoi : un nouveau code ne part pas avant le délai de renvoi
    @Column(nullable = false)
    private Instant sentAt;

    // Envois depuis windowStartedAt : plafonnés par jour, contre l'envoi en rafale vers une adresse
    private int sendCount;

    @Column(nullable = false)
    private Instant windowStartedAt;
}
