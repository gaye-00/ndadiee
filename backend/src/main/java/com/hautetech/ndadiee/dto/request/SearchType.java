package com.hautetech.ndadiee.dto.request;

/**
 * Énumération définissant les catégories de contenu pouvant
 * être ciblées par la recherche globale de la plateforme.
 *
 * Elle permet de préciser le type de résultats souhaité
 * à l'aide du paramètre {@code type} de l'endpoint {@code /search}.
 */
public enum SearchType {
    ALL,
    QUESTIONS,
    ARTICLES,
    PROJECTS,
    USERS
}
