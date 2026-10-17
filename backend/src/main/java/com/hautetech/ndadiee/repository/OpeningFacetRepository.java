package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.project.ProjectOpening;

/**
 * Facettes des annonces : parmi les annonces d'une recherche, combien pour chaque rôle, technologie et
 * pays du porteur, et ce qu'elles proposent (OpeningFacetRepositoryImpl).
 */
public interface OpeningFacetRepository {

    /** Lignes [rôle, annonces, places]. */
    List<Object[]> countByRole(Specification<ProjectOpening> filter);

    /** Lignes [slug, nom, annonces], les technologies les plus demandées d'abord (100 au plus). */
    List<Object[]> countByTag(Specification<ProjectOpening> filter);

    /** Lignes [pays du porteur, annonces] ; les porteurs sans pays n'y sont pas. */
    List<Object[]> countByOwnerCountry(Specification<ProjectOpening> filter);

    /** Places proposées par ces annonces. */
    long sumSeats(Specification<ProjectOpening> filter);

    /** Projets qui publient ces annonces. */
    long countProjects(Specification<ProjectOpening> filter);

    /** Parmi ces annonces, celles qui n'ont aucune candidature en attente. */
    long countWithoutApplicants(Specification<ProjectOpening> filter);
}
