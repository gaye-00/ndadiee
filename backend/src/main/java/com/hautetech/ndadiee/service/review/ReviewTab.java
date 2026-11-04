package com.hautetech.ndadiee.service.review;

/** Les onglets de la page des revues, du point de vue du membre connecté. */
public enum ReviewTab {
    // PR ouvertes dont il est relecteur, sans verdict rendu (un requis qui a seulement commenté y reste)
    TO_REVIEW,
    // PR communautaires ouvertes d'autres projets, dont il n'est ni l'auteur ni encore relecteur
    COMMUNITY,
    // Ses PR, les ouvertes d'abord
    MINE,
    // PR ouvertes de ses équipes
    TEAM,
    // PR fusionnées ou fermées de ses équipes, et celles qu'il a écrites ou relues
    DONE
}
