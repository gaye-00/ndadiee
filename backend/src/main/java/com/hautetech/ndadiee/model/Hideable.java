package com.hautetech.ndadiee.model;

import java.time.Instant;

/**
 * Contenu que l'administration peut masquer (sujet du forum, réponse, projet) : il quitte les pages publiques
 * sans être supprimé, et se rétablit tel quel. Son auteur le voit encore, avec le motif ; les admins aussi.
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
