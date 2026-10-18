package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;

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

    // Équipes de plusieurs projets en une requête, membres chargés, dans l'ordre d'arrivée (le porteur d'abord)
    @Query("""
            SELECT m FROM ProjectMember m JOIN FETCH m.user
            WHERE m.project.id IN :projectIds AND m.status = :status
            ORDER BY m.createdAt ASC, m.id ASC
            """)
    List<ProjectMember> findWithUserByProjectIdsAndStatus(@Param("projectIds") Collection<Long> projectIds,
            @Param("status") MemberStatus status);

    // Candidatures de plusieurs annonces en une requête : lignes [id de l'annonce, total]
    @Query("""
            SELECT m.opening.id, COUNT(m) FROM ProjectMember m
            WHERE m.opening.id IN :openingIds AND m.status = :status
            GROUP BY m.opening.id
            """)
    List<Object[]> countByOpeningIdsAndStatus(@Param("openingIds") Collection<Long> openingIds,
            @Param("status") MemberStatus status);

    long countByOpeningIdAndStatus(Long openingId, MemberStatus status);

    // ─── Profil d'un membre ───

    /**
     * Les équipes d'un membre, ses propres projets compris, projet chargé : les siens d'abord, puis les plus étoilés,
     * puis les plus récentes. Un projet masqué n'y figure que pour qui peut encore le voir ({@code withHidden}).
     */
    @Query(value = """
            SELECT m FROM ProjectMember m JOIN FETCH m.project p
            WHERE m.user.id = :userId AND m.status = :status AND (:withHidden = true OR p.hiddenAt IS NULL)
            ORDER BY CASE WHEN m.role = :lead THEN 0 ELSE 1 END, p.starsCount DESC, m.createdAt DESC, m.id DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM ProjectMember m
            WHERE m.user.id = :userId AND m.status = :status AND (:withHidden = true OR m.project.hiddenAt IS NULL)
            """)
    Page<ProjectMember> findTeamsOf(@Param("userId") Long userId, @Param("status") MemberStatus status,
            @Param("lead") ProjectRole lead, @Param("withHidden") boolean withHidden, Pageable pageable);

    // Équipes rejointes : les projets visibles où il est accepté sans en être le porteur
    long countByUserIdAndStatusAndRoleNotAndProjectHiddenAtIsNull(Long userId, MemberStatus status, ProjectRole role);

    // Ses coéquipiers sur ses projets visibles : lignes [coéquipier, id, nom, slug et étoiles du projet], acceptés
    // de part et d'autre
    @Query("""
            SELECT other.user.id, p.id, p.name, p.slug, p.starsCount
            FROM ProjectMember mine JOIN mine.project p, ProjectMember other
            WHERE other.project = p AND mine.user.id = :userId AND other.user.id <> :userId
              AND mine.status = :status AND other.status = :status AND p.hiddenAt IS NULL
            """)
    List<Object[]> findTeammates(@Param("userId") Long userId, @Param("status") MemberStatus status);
}
