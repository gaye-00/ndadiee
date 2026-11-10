package com.hautetech.ndadiee.model.user;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
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
 * Un code envoyé par e-mail pour un geste sensible sur un compte déjà ouvert : choisir un nouveau mot de passe
 * (oublié), ou confirmer la suppression d'un compte qui n'a pas de mot de passe (GitHub, Google). Un seul code à la
 * fois par compte et par geste ; utilisé, il disparaît.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "account_codes",
    uniqueConstraints = @UniqueConstraint(name = "uk_account_codes_user_purpose", columnNames = { "user_id", "purpose" })
)
public class AccountCode extends OneTimeCode {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    // Le compte supprimé emporte ses codes
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Purpose purpose;

    public enum Purpose {
        /** Mot de passe oublié : le code permet d'en choisir un nouveau */
        PASSWORD_RESET,
        /** Suppression d'un compte sans mot de passe : le code la confirme */
        ACCOUNT_DELETION
    }
}
