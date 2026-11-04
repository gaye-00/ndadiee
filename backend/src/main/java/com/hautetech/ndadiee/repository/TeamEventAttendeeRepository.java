package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.workspace.TeamEventAttendee;

public interface TeamEventAttendeeRepository extends JpaRepository<TeamEventAttendee, Long> {

    /** Les participants de plusieurs rendez-vous en une requête, membre chargé, dans l'ordre des réponses. */
    @Query("""
            SELECT a FROM TeamEventAttendee a JOIN FETCH a.user
            WHERE a.message.id IN :messageIds
            ORDER BY a.createdAt ASC, a.id ASC
            """)
    List<TeamEventAttendee> findWithUserByMessageIds(@Param("messageIds") Collection<Long> messageIds);

    // Répondre deux fois (double clic, deux onglets) ne fait rien : pas d'erreur de doublon à rattraper
    @Modifying
    @Query(value = """
            INSERT INTO team_event_attendees (message_id, user_id, created_at, updated_at)
            VALUES (:messageId, :userId, now(), now())
            ON CONFLICT (message_id, user_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("messageId") Long messageId, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM TeamEventAttendee a WHERE a.message.id = :messageId AND a.user.id = :userId")
    int deleteByMessageAndUser(@Param("messageId") Long messageId, @Param("userId") Long userId);
}
