package com.hautetech.ndadiee.model;

import java.time.Instant;

/**
 * Définit le contrat applicable aux contenus pouvant être masqués
 * par l'administration de la plateforme Ndadiee.
 *
 * Le masquage permet de retirer un contenu des pages publiques sans
 * le supprimer de la base de données. Le contenu peut ainsi être rétabli
 * ultérieurement avec ses informations d'origine.
 *
 * L'auteur du contenu et les administrateurs peuvent toujours consulter
 * le contenu masqué, ainsi que le motif de son masquage, selon les règles
 * d'accès définies par l'application.
 *
 * Les classes qui implémentent cette interface doivent fournir les
 * informations relatives au masquage et à son éventuel motif.
 */
public interface Hideable {

    Instant getHiddenAt();

    void setHiddenAt(Instant hiddenAt);

    String getHiddenReason();

    void setHiddenReason(String hiddenReason);

    default boolean isHidden() {
        return getHiddenAt() != null;
    }
}
