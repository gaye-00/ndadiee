package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.workspace.TeamMessage;
import com.hautetech.ndadiee.model.workspace.TeamMessageKind;
import com.hautetech.ndadiee.service.workspace.Revision;

public interface TeamMessageRepository extends JpaRepository<TeamMessage, Long> {

    /** Les derniers messages, les plus récents d'abord. */
    @EntityGraph(attributePaths = "author")
    @Query("SELECT m FROM TeamMessage m WHERE m.project.id = :projectId ORDER BY m.id DESC")
    List<TeamMessage> findLatest(@Param("projectId") Long projectId, Pageable limit);

    /**
     * Les messages d'avant un message, les plus récents d'abord : la discussion se remonte page après page, et un
     * message arrivé entre deux pages ne décale rien.
     */
    @EntityGraph(attributePaths = "author")
    @Query("SELECT m FROM TeamMessage m WHERE m.project.id = :projectId AND m.id < :before ORDER BY m.id DESC")
    List<TeamMessage> findBefore(@Param("projectId") Long projectId, @Param("before") Long before, Pageable limit);

    Optional<TeamMessage> findByIdAndProjectId(Long id, Long projectId);

    /** Le prochain rendez-vous de l'équipe, ou celui en cours : celui qui commence le plus tôt. */
    @EntityGraph(attributePaths = "author")
    Optional<TeamMessage> findFirstByProjectIdAndKindAndEventEndsAtAfterOrderByEventStartsAtAscIdAsc(Long projectId,
            TeamMessageKind kind, Instant now);

    /** Ce qui change dans la discussion se voit ici : un message de plus ou de moins, un rendez-vous qui bouge. */
    @Query("""
            SELECT new com.hautetech.ndadiee.service.workspace.Revision(COUNT(m), MAX(m.updatedAt))
            FROM TeamMessage m WHERE m.project.id = :projectId
            """)
    Revision findRevision(@Param("projectId") Long projectId);
}
