package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.hautetech.ndadiee.model.project.ProjectOpening;

public interface ProjectOpeningRepository extends JpaRepository<ProjectOpening, Long>, JpaSpecificationExecutor<ProjectOpening>,
        OpeningFacetRepository {

    // Rôles ouverts de plusieurs projets en une requête (cartes de la vitrine)
    List<ProjectOpening> findByProjectIdInAndOpenTrueOrderByIdAsc(Collection<Long> projectIds);

    // Les annonces d'un projet masqué par l'administration ne s'affichent nulle part
    @Query("SELECT COUNT(o) FROM ProjectOpening o WHERE o.open = true AND o.project.hiddenAt IS NULL")
    long countOpen();

    // Places proposées par les rôles ouverts
    @Query("SELECT COALESCE(SUM(o.seats), 0) FROM ProjectOpening o WHERE o.open = true AND o.project.hiddenAt IS NULL")
    long sumOpenSeats();

    // Tous les rôles ouverts avec leur projet et son porteur, les plus récents d'abord (bande des rôles)
    @Query("""
            SELECT o FROM ProjectOpening o JOIN FETCH o.project p JOIN FETCH p.owner
            WHERE o.open = true AND p.hiddenAt IS NULL
            ORDER BY o.createdAt DESC, o.id DESC
            """)
    List<ProjectOpening> findAllOpenWithProject();

    // Annonces ouvertes par technologie et par projet : lignes [slug, nom, usages du tag, id du projet,
    // annonces, places]. Un projet porte une technologie une seule fois : chaque annonce compte une fois.
    @Query("""
            SELECT t.slug, t.name, t.usageCount, p.id, COUNT(o), COALESCE(SUM(o.seats), 0)
            FROM ProjectOpening o JOIN o.project p JOIN p.tags t
            WHERE o.open = true AND p.hiddenAt IS NULL
            GROUP BY t.slug, t.name, t.usageCount, p.id
            """)
    List<Object[]> countOpenByStackAndProject();
}
