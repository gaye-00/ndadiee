package com.hautetech.ndadiee.model.user;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;

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
 * Un compte GitHub ou Google relié à un compte Ndadiee : s'y connecter ouvre une session sur ce compte. Un compte
 * Ndadiee a au plus une identité par fournisseur, et une identité n'appartient qu'à un compte.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "user_identities",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_identities_subject", columnNames = { "provider", "subject" }),
        @UniqueConstraint(name = "uk_user_identities_user_provider", columnNames = { "user_id", "provider" })
    }
)
public class UserIdentity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    // Le compte supprimé emporte ses identités
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OAuthProvider provider;

    // L'identifiant du compte chez le fournisseur, qui ne change jamais (pas le pseudo ni l'e-mail, qui changent)
    @Column(nullable = false, length = 100)
    private String subject;

    // L'e-mail vérifié du compte chez le fournisseur, à la dernière connexion
    private String email;
}
