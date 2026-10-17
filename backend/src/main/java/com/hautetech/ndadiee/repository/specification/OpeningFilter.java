package com.hautetech.ndadiee.repository.specification;

import java.util.Locale;

import com.hautetech.ndadiee.model.project.TeamRole;

/**
 * Filtres des annonces (GET /v1/openings et ses facettes). Un filtre absent ne filtre pas ; seules les
 * annonces ouvertes sont concernées.
 *
 * @param role    rôle du catalogue
 * @param q       mot-clé : intitulé, description ou issue « premier pas » de l'annonce, nom, accroche ou
 *                technologie de son projet
 * @param tag     slug d'une technologie du projet
 * @param country pays du porteur du projet, code ISO à 2 lettres
 */
public record OpeningFilter(TeamRole role, String q, String tag, String country) {

    // Codes pays en majuscules : comme en base
    public OpeningFilter {
        country = country == null ? null : country.trim().toUpperCase(Locale.ROOT);
    }

    /** Sans le rôle : la base de la facette « rôle » et de « Toutes ». */
    public OpeningFilter withoutRole() {
        return new OpeningFilter(null, q, tag, country);
    }

    public OpeningFilter withoutTag() {
        return new OpeningFilter(role, q, null, country);
    }

    public OpeningFilter withoutCountry() {
        return new OpeningFilter(role, q, tag, null);
    }
}
