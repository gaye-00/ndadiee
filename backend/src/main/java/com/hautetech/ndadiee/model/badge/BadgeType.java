package com.hautetech.ndadiee.model.badge;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Catalogue des badges attribués automatiquement. Chaque entrée correspond à une ligne
 * de la table badges (retrouvée par son nom), créée au démarrage si elle manque.
 */
@Getter
@RequiredArgsConstructor
public enum BadgeType {

    FIRST_QUESTION("Curieux", "A posé sa première question", "Poser une première question", 0),
    FIRST_ANSWER("Entraide", "A répondu à une question pour la première fois", "Publier une première réponse", 0),
    FIRST_ACCEPTED_ANSWER("Problème résolu", "Une de ses réponses a été acceptée", "Avoir une première réponse acceptée", 0),
    FIRST_ARTICLE("Plume", "A publié son premier article", "Publier un premier article", 0),
    FIRST_PROJECT("Bâtisseur", "A présenté son premier projet open source", "Publier un premier projet", 0),
    REPUTATION_100("Contributeur", "A atteint 100 points de réputation", "Atteindre 100 points de réputation", 100),
    REPUTATION_500("Expert", "A atteint 500 points de réputation", "Atteindre 500 points de réputation", 500);

    private final String label;
    private final String description;
    private final String criteria;

    // Seuil de réputation qui déclenche le badge ; 0 pour les badges liés à une action
    private final int reputationThreshold;
}
