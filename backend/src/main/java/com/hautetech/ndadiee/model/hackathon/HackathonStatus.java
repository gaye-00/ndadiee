package com.hautetech.ndadiee.model.hackathon;

import java.time.Instant;

/** Où en est un hackathon, d'après ses dates. Jamais stocké : il change avec l'heure. */
public enum HackathonStatus {
    /** Avant le coup d'envoi, inscriptions ouvertes ou closes */
    UPCOMING,
    ONGOING,
    ENDED;

    public static HackathonStatus of(Hackathon hackathon, Instant now) {
        if (now.isBefore(hackathon.getStartsAt())) {
            return UPCOMING;
        }
        return now.isBefore(hackathon.getEndsAt()) ? ONGOING : ENDED;
    }
}
