package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectMember;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);

    List<ProjectMember> findByProjectIdOrderByCreatedAtAsc(Long projectId);

    List<ProjectMember> findByProjectIdAndStatusOrderByCreatedAtAsc(Long projectId, MemberStatus status);

    long countByProjectIdAndStatus(Long projectId, MemberStatus status);

    // Nombre de membres de plusieurs projets en une requête : lignes [projectId, total]
    @Query("""
            SELECT m.project.id, COUNT(m) FROM ProjectMember m
            WHERE m.project.id IN :projectIds AND m.status = :status
            GROUP BY m.project.id
            """)
    List<Object[]> countByProjectIdsAndStatus(@Param("projectIds") Collection<Long> projectIds,
            @Param("status") MemberStatus status);

    List<ProjectMember> findByUserIdAndProjectIdIn(Long userId, Collection<Long> projectIds);
}
