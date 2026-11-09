package com.hautetech.ndadiee.model.user;

import java.time.Instant;
import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.Language;

import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Compte de la plateforme. Porte l'identité et l'authentification, communes à
 * {@link Developer} (membre de la communauté) et {@link Admin} (back-office).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_username", columnNames = "username"),
        @UniqueConstraint(name = "uk_users_email", columnNames = "email")
    },
    indexes = {
        @Index(name = "idx_users_country", columnList = "country"),
        @Index(name = "idx_users_reputation", columnList = "reputation DESC"),
        // Les comptes suspendus, que le back-office liste : une poignée, indexée seule
        @Index(name = "idx_users_blocked", columnList = "blocked_at", options = "where blocked_at is not null")
    },
    check = {
        @CheckConstraint(name = "ck_users_type", constraint = "user_type in ('developer', 'admin')"),
        // Les colonnes propres aux développeurs, vides pour les admins, sont remplies pour chaque développeur
        @CheckConstraint(name = "ck_users_developer",
            constraint = "user_type <> 'developer' or (reputation is not null and open_to_work is not null)")
    }
)
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "user_type")
public abstract class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, length = 30)
    private String username;

    @Column(nullable = false)
    private String email;

    // Haché en BCrypt
    @ToString.Exclude
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Column(length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Language preferredLanguage = Language.FR;

    // E-mails des revues de code (un commentaire sur sa PR, un verdict, sa revue jugée utile) : activés par défaut
    @Column(nullable = false)
    @Builder.Default
    private boolean reviewEmails = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Suspension par l'administration : null tant que le compte est actif
    private Instant blockedAt;

    // Motif de la suspension, montré au titulaire quand sa connexion est refusée
    @Column(length = 500)
    private String blockedReason;

    // Dernière connexion réussie (back-office : membres actifs)
    private Instant lastLoginAt;

    /**
     * L'adresse e-mail est-elle prouvée ? Faux seulement pour un compte créé par le formulaire et dont le code reçu
     * par e-mail n'a pas encore été saisi : il ne peut pas encore se connecter. Vrai pour les comptes GitHub et Google
     * (le fournisseur a vérifié l'adresse) et pour ceux d'avant la vérification (la colonne arrive à vrai).
     */
    @Builder.Default
    @ColumnDefault("true")
    @Column(nullable = false)
    private boolean emailVerified = true;

    /**
     * Suspendu par l'administration : ni connexion, ni renouvellement de session, ni requête authentifiée.
     * Volontairement distinct de {@link #isAccountNonLocked()} : Spring vérifie ce dernier avant le mot de
     * passe, et dirait à n'importe qui qu'un compte existe et qu'il est suspendu.
     */
    public boolean isBlocked() {
        return blockedAt != null;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return role.getAuthorities();
    }
}
