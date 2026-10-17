package com.hautetech.ndadiee.model.project;

/**
 * Catalogue des rôles qu'une équipe peut rechercher. Le frontend associe à chacun son
 * libellé traduit et son motif tissé (config/roles.ts) : les deux listes restent alignées.
 */
public enum TeamRole {
    FRONTEND,
    BACKEND,
    MOBILE,
    DESIGN,
    DATA,
    DEVOPS,
    SECURITY,
    /** Mobile Money, USSD et paiements */
    PAYMENTS,
    /** Traduction et langues */
    L10N,
    /** Rédaction technique */
    DOCS,
    PRODUCT,
    /** IoT et embarqué */
    EMBEDDED,
    /** Tests et qualité */
    QA
}
