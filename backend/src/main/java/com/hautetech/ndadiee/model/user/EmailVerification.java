package com.hautetech.ndadiee.model.user;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

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
 * nouveau remplace l'ancien. Saisi juste, il disparaît avec cette ligne.
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
public class EmailVerification extends OneTimeCode {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    // Le compte supprimé (inscription jamais confirmée) emporte son code
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private User user;
}
