package com.hautetech.ndadiee.dto.response;

import java.util.List;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Facettes des annonces (GET /v1/openings/facets). Chaque facette compte les annonces avec tous les filtres
 * de la recherche sauf le sien : choisir une valeur montrée ne mène jamais à une liste vide.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpeningFacetsResponse {

    /** Annonces qui répondent à tous les filtres */
    private long total;
    /** Places qu'elles proposent */
    private long seats;
    /** Projets qui les publient */
    private long projects;
    /** Parmi elles, celles qui n'ont aucune candidature en attente */
    private long unclaimed;
    /** Sans filtre de rôle (« Toutes ») */
    private long all;
    /** Rôles, dans l'ordre du catalogue ; un rôle absent n'a aucune annonce */
    private List<RoleFacet> roles;
    /** Technologies des projets, les plus demandées d'abord */
    private List<StackFacet> stacks;
    /** Pays des porteurs, les plus représentés d'abord */
    private List<CountryFacet> countries;

    public record RoleFacet(TeamRole role, long openings, long seats) {
    }

    public record StackFacet(String slug, String name, long openings) {
    }

    /** @param country code ISO à 2 lettres */
    public record CountryFacet(String country, long openings) {
    }
}
