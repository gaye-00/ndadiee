package com.hautetech.ndadiee.authentication.account;

import java.util.List;

import com.hautetech.ndadiee.dto.response.UserSummaryResponse;

/**
 * Ce que la suppression ferait, montré avant de confirmer : le délai pour changer d'avis, et le sort de chaque projet
 * porté (transmis à un membre de son équipe, ou supprimé).
 *
 * @param gracePeriodDays  jours avant l'effacement, pendant lesquels une connexion annule tout
 * @param passwordRequired vrai si le compte se confirme par son mot de passe ; faux : par un code envoyé par e-mail
 * @param email            l'adresse où partirait le code
 */
public record AccountDeletionPreview(long gracePeriodDays, boolean passwordRequired, String email,
        List<OwnedProject> projects) {

    /**
     * @param successor le membre qui reprendrait le projet, ou null s'il partait avec le compte
     */
    public record OwnedProject(Long id, String name, String slug, UserSummaryResponse successor) {
    }
}
