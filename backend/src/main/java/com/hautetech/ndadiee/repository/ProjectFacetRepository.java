package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.project.Project;

/**
 * Facettes de la vitrine : parmi les projets d'une recherche, combien pour chaque rôle recherché,
 * technologie et pays (ProjectFacetRepositoryImpl).
 */
public interface ProjectFacetRepository {

    /** Lignes [rôle, projets, places] des annonces ouvertes. */
    List<Object[]> countByOpenRole(Specification<Project> filter);

    /** Lignes [slug, nom, projets], les technologies les plus présentes d'abord (100 au plus). */
    List<Object[]> countByTag(Specification<Project> filter);

    /** Lignes [pays du porteur, projets] ; les porteurs sans pays n'y sont pas. */
    List<Object[]> countByOwnerCountry(Specification<Project> filter);

    /** Places proposées par les annonces ouvertes de ces projets. */
    long sumOpenSeats(Specification<Project> filter);
}
