package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.workspace.Sprint;

public interface SprintRepository extends JpaRepository<Sprint, Long> {

    /** Le sprint en cours : il n'y en a qu'un à la fois. */
    Optional<Sprint> findByProjectIdAndClosedAtIsNull(Long projectId);

    @Query("SELECT COALESCE(MAX(s.number), 0) FROM Sprint s WHERE s.project.id = :projectId")
    int findLastNumber(@Param("projectId") Long projectId);
}
