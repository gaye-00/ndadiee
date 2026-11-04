package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.Project;

import jakarta.persistence.LockModeType;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project>,
        ProjectFacetRepository {

    Optional<Project> findBySlug(String slug);

    /**
     * Le projet, verrouillé jusqu'à la fin de la transaction : les gestes de son équipe qui numérotent ou rangent (une
     * tâche créée, déplacée ; un sprint ouvert, clos) passent l'un après l'autre.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);

    boolean existsBySlug(String slug);

    // Les chiffres publics ne comptent que les projets visibles (voir Hideable)
    long countByOwnerIdAndHiddenAtIsNull(Long ownerId);

    long countByHiddenAtIsNull();

    long countByHiddenAtIsNotNull();

    long countByCreatedAtGreaterThanEqual(Instant since);

    // [porteur, nombre de projets] pour ces membres (back-office : une requête pour toute la page)
    @Query("SELECT p.owner.id, COUNT(p) FROM Project p WHERE p.owner.id IN :ownerIds GROUP BY p.owner.id")
    List<Object[]> countByOwners(@Param("ownerIds") Collection<Long> ownerIds);

    /** Les projets visibles qui pointent vers l'un de ces dépôts (adresses en minuscules), les plus anciens d'abord */
    @Query("SELECT p.slug FROM Project p WHERE LOWER(p.repositoryUrl) IN :urls AND p.hiddenAt IS NULL ORDER BY p.createdAt ASC")
    List<String> findSlugsByRepositoryUrls(@Param("urls") Collection<String> urls);

    @Modifying
    @Query("""
            UPDATE Project p
            SET p.starsCount = CASE WHEN p.starsCount + :delta < 0 THEN 0 ELSE p.starsCount + :delta END
            WHERE p.id = :id
            """)
    void addStars(@Param("id") Long id, @Param("delta") int delta);
}
