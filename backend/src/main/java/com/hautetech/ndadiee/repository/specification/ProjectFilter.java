package com.hautetech.ndadiee.repository.specification;

import java.util.Locale;

import com.hautetech.ndadiee.model.project.TeamRole;

/**
 * Filtres de la vitrine des projets (GET /v1/projects et ses facettes). Un filtre absent ne filtre pas.
 *
 * @param q                      mot-clé : nom, accroche, description ou technologie du projet
 * @param tag                    slug d'une technologie du projet
 * @param lookingForContributors le projet accepte des contributeurs (« recrute »)
 * @param owner                  nom d'utilisateur du porteur, en minuscules
 * @param role                   rôle d'une annonce ouverte du projet
 * @param country                pays du porteur, code ISO à 2 lettres
 */
public record ProjectFilter(String q, String tag, Boolean lookingForContributors, String owner, TeamRole role,
        String country) {

    // Noms d'utilisateur en minuscules, codes pays en majuscules : comme en base
    public ProjectFilter {
        owner = owner == null ? null : owner.trim().toLowerCase(Locale.ROOT);
        country = country == null ? null : country.trim().toUpperCase(Locale.ROOT);
    }

    /** Recherche par mot-clé seulement (recherche globale). */
    public static ProjectFilter keyword(String q) {
        return new ProjectFilter(q, null, null, null, null, null);
    }

    /** Sans le rôle ni le recrutement : la base des facettes « rôle recherché ». */
    public ProjectFilter withoutRecruitment() {
        return new ProjectFilter(q, tag, null, owner, null, country);
    }

    /** Seulement les projets qui recrutent. */
    public ProjectFilter recruiting() {
        return new ProjectFilter(q, tag, true, owner, role, country);
    }

    public ProjectFilter withoutTag() {
        return new ProjectFilter(q, null, lookingForContributors, owner, role, country);
    }

    public ProjectFilter withoutCountry() {
        return new ProjectFilter(q, tag, lookingForContributors, owner, role, null);
    }
}
