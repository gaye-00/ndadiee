package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.ProjectMedia;

public interface ProjectMediaRepository extends JpaRepository<ProjectMedia, Long> {

    List<ProjectMedia> findByProjectIdOrderByPositionAscIdAsc(Long projectId);

    long countByProjectId(Long projectId);

    // Rang de la prochaine image ajoutée à la galerie
    @Query("SELECT COALESCE(MAX(m.position) + 1, 0) FROM ProjectMedia m WHERE m.project.id = :projectId")
    int nextPosition(@Param("projectId") Long projectId);
}
