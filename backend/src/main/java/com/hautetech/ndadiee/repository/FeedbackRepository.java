package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.project.Feedback;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    boolean existsByCallIdAndAuthorId(Long callId, Long authorId);

    // Retours de plusieurs demandes en une requête : lignes [id de la demande, nombre, note moyenne]
    @Query("""
            SELECT f.call.id, COUNT(f), AVG(f.rating) FROM Feedback f
            WHERE f.call.id IN :callIds
            GROUP BY f.call.id
            """)
    List<Object[]> summarize(@Param("callIds") Collection<Long> callIds);

    // Parmi ces demandes, celles auxquelles ce membre a déjà répondu
    @Query("SELECT f.call.id FROM Feedback f WHERE f.author.id = :authorId AND f.call.id IN :callIds")
    List<Long> findCallIdsAnsweredBy(@Param("authorId") Long authorId, @Param("callIds") Collection<Long> callIds);

    @EntityGraph(attributePaths = "author")
    Page<Feedback> findByCallId(Long callId, Pageable pageable);
}
