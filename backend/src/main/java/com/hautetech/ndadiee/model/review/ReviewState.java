package com.hautetech.ndadiee.model.review;

/**
 * La revue d'un relecteur (design 3C, « Relecteurs ») : demandée et pas encore faite, commentée sans verdict,
 * approuvée, ou avec des changements demandés.
 */
public enum ReviewState {
    REQUESTED,
    COMMENTED,
    APPROVED,
    CHANGES_REQUESTED
}
