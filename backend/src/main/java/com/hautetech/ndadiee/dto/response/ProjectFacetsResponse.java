package com.hautetech.ndadiee.dto.response;

import java.util.List;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Facettes de la vitrine (GET /v1/projects/facets). Chaque facette compte les projets avec tous les filtres
 * de la recherche sauf le sien : choisir une valeur montrée ne mène jamais à une vitrine vide.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectFacetsResponse {

    /** Projets qui répondent à tous les filtres */
    private long total;
    /** Places proposées par leurs annonces ouvertes */
    private long seats;
    /** Sans filtre de rôle ni de recrutement (« Tous ») */
    private long all;
    /** Parmi eux, ceux qui recrutent */
    private long recruiting;
    /** Rôles des annonces ouvertes, dans l'ordre du catalogue */
    private List<RoleFacet> roles;
    /** Technologies, les plus présentes d'abord */
    private List<StackFacet> stacks;
    /** Pays des porteurs, les plus représentés d'abord */
    private List<CountryFacet> countries;

    public record RoleFacet(TeamRole role, long projects, long seats) {
    }

    public record StackFacet(String slug, String name, long projects) {
    }

    /** @param country code ISO à 2 lettres */
    public record CountryFacet(String country, long projects) {
    }
}
