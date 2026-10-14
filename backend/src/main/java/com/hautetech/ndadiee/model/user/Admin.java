package com.hautetech.ndadiee.model.user;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * Compte d'administration (back-office). Ne participe pas à la communauté :
 * pas de profil public, de réputation ni de contenu.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@NoArgsConstructor
@SuperBuilder
@Entity
@DiscriminatorValue("admin")
public class Admin extends User {
}
