package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.Project;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {

    Optional<Project> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByOwnerId(Long ownerId);

    @Modifying
    @Query("""
            UPDATE Project p
            SET p.starsCount = CASE WHEN p.starsCount + :delta < 0 THEN 0 ELSE p.starsCount + :delta END
            WHERE p.id = :id
            """)
    void addStars(@Param("id") Long id, @Param("delta") int delta);
}
