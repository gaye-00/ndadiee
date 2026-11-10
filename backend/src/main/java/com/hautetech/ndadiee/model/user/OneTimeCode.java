package com.hautetech.ndadiee.model.user;

import java.time.Instant;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * Un code à 6 chiffres envoyé par e-mail, le temps qu'il soit saisi : il prouve que le membre lit cette adresse.
 * Seule son empreinte est gardée. Ses essais et ses envois sont comptés (OneTimeCodes) : un code ne se devine pas,
 * et une adresse ne se fait pas bombarder.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@MappedSuperclass
public abstract class OneTimeCode extends BaseEntity {

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
