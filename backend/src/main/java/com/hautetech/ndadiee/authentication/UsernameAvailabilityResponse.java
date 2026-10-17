package com.hautetech.ndadiee.authentication;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un nom d'utilisateur est-il libre ? Sinon, pourquoi, et quelques variantes libres (inscription). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UsernameAvailabilityResponse {

    /** Pourquoi le nom n'est pas libre */
    public enum Reason {
        // Ne respecte pas la règle : 3 à 30 caractères, lettres, chiffres ou _
        INVALID,
        // Réservé (« admin », « me »…)
        RESERVED,
        // Déjà pris par un membre
        TAKEN
    }

    // Tel qu'il serait enregistré : en minuscules, sans espaces autour
    private String username;
    private boolean available;
    private Reason reason;
    private List<String> suggestions;
}
