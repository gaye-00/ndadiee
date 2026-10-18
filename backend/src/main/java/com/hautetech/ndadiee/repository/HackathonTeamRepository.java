package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.hackathon.HackathonTeam;
import com.hautetech.ndadiee.model.project.MemberStatus;

public interface HackathonTeamRepository extends JpaRepository<HackathonTeam, Long> {

    Optional<HackathonTeam> findByHackathonIdAndProjectId(Long hackathonId, Long projectId);

    boolean existsByHackathonIdAndProjectId(Long hackathonId, Long projectId);

    long countByHackathonId(Long hackathonId);

    Optional<HackathonTeam> findByHackathonIdAndRank(Long hackathonId, Integer rank);

    // Équipes de plusieurs hackathons en une requête, projet et porteur chargés : le palmarès d'abord,
    // puis dans l'ordre d'inscription
    @Query("""
            SELECT t FROM HackathonTeam t JOIN FETCH t.project p JOIN FETCH p.owner
            WHERE t.hackathon.id IN :hackathonIds
            ORDER BY CASE WHEN t.rank IS NULL THEN 1 ELSE 0 END, t.rank, t.createdAt, t.id
            """)
    List<HackathonTeam> findWithProjectByHackathonIds(@Param("hackathonIds") Collection<Long> hackathonIds);

    // Inscriptions de ces projets à un hackathon pas encore terminé, hackathon chargé, le plus proche d'abord
    @Query("""
            SELECT t FROM HackathonTeam t JOIN FETCH t.hackathon h
            WHERE t.project.id IN :projectIds AND h.endsAt > :now
            ORDER BY h.startsAt ASC, h.id ASC
            """)
    List<HackathonTeam> findCurrentByProjectIds(@Param("projectIds") Collection<Long> projectIds, @Param("now") Instant now);

    // Inscriptions à un hackathon pas encore terminé des projets dont ce membre fait partie (le porteur
    // en est membre accepté dès la création), hackathon chargé, le plus proche d'abord
    @Query("""
            SELECT t FROM HackathonTeam t JOIN FETCH t.hackathon h
            WHERE h.endsAt > :now AND EXISTS (
                SELECT m.id FROM ProjectMember m
                WHERE m.project = t.project AND m.user.id = :userId AND m.status = :status)
            ORDER BY h.startsAt ASC, h.id ASC
            """)
    List<HackathonTeam> findCurrentForMember(@Param("userId") Long userId, @Param("status") MemberStatus status,
            @Param("now") Instant now);

    // Hackathons commencés où ce membre avait une équipe : un projet visible dont il est membre accepté
    @Query("""
            SELECT COUNT(DISTINCT t.hackathon.id) FROM HackathonTeam t
            WHERE t.hackathon.startsAt <= :now AND t.project.hiddenAt IS NULL AND EXISTS (
                SELECT m.id FROM ProjectMember m
                WHERE m.project = t.project AND m.user.id = :userId AND m.status = :status)
            """)
    long countStartedForMember(@Param("userId") Long userId, @Param("status") MemberStatus status, @Param("now") Instant now);

    // Places sur un podium (1re à 3e) des équipes de ce membre, sur ses projets visibles
    @Query("""
            SELECT COUNT(t) FROM HackathonTeam t
            WHERE t.rank BETWEEN 1 AND 3 AND t.project.hiddenAt IS NULL AND EXISTS (
                SELECT m.id FROM ProjectMember m
                WHERE m.project = t.project AND m.user.id = :userId AND m.status = :status)
            """)
    long countPodiumsForMember(@Param("userId") Long userId, @Param("status") MemberStatus status);

    // Le projet est-il déjà inscrit à un hackathon dont les dates chevauchent celles-ci ?
    @Query("""
            SELECT COUNT(t) > 0 FROM HackathonTeam t
            WHERE t.project.id = :projectId AND t.hackathon.startsAt < :endsAt AND t.hackathon.endsAt > :startsAt
            """)
    boolean existsOverlapping(@Param("projectId") Long projectId, @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt);
}
