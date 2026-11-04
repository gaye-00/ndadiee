package com.hautetech.ndadiee.service.workspace;

import java.time.Instant;

/**
 * L'état d'une liste à un instant (le tableau, la discussion) : combien de lignes, et la dernière modification. Une ligne
 * ajoutée, supprimée ou modifiée change l'un ou l'autre : il suffit de comparer deux révisions pour savoir s'il faut
 * relire la liste, sans la relire.
 */
public record Revision(Long count, Instant lastChange) {

    /** « 12-1761980000000 » : à comparer tel quel, sans l'interpréter */
    public String token() {
        return count + "-" + (lastChange == null ? 0 : lastChange.toEpochMilli());
    }
}
