package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.message.ConversationParticipant;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    /**
     * La boîte d'un membre : ses conversations, la plus récemment active d'abord. Une conversation ouverte sans message
     * n'apparaît que chez celui qui l'a ouverte.
     */
    @Query(value = """
            SELECT p FROM ConversationParticipant p JOIN FETCH p.conversation c
            WHERE p.user.id = :userId AND (c.lastMessageAt IS NOT NULL OR c.createdBy.id = :userId)
            ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC, c.id DESC
            """,
            countQuery = """
            SELECT COUNT(p) FROM ConversationParticipant p JOIN p.conversation c
            WHERE p.user.id = :userId AND (c.lastMessageAt IS NOT NULL OR c.createdBy.id = :userId)
            """)
    Page<ConversationParticipant> findInbox(@Param("userId") Long userId, Pageable pageable);

    /** L'autre membre de chacune de ces conversations, avec son compte. */
    @Query("""
            SELECT p FROM ConversationParticipant p JOIN FETCH p.user
            WHERE p.conversation.id IN :conversationIds AND p.user.id <> :userId
            """)
    List<ConversationParticipant> findOthers(@Param("conversationIds") Collection<Long> conversationIds, @Param("userId") Long userId);

    @Query("SELECT p.user.id FROM ConversationParticipant p WHERE p.conversation.id = :conversationId")
    List<Long> findUserIds(@Param("conversationId") Long conversationId);

    /** Les membres avec qui il a une conversation : ils voient s'il est en ligne. */
    @Query("""
            SELECT DISTINCT other.user.id FROM ConversationParticipant me, ConversationParticipant other
            WHERE me.user.id = :userId AND other.conversation = me.conversation AND other.user.id <> :userId
            """)
    List<Long> findContactIds(@Param("userId") Long userId);

    /** Les conversations où un message reçu attend d'être lu (la pastille de la messagerie). */
    @Query("""
            SELECT COUNT(DISTINCT p.conversation.id) FROM ConversationParticipant p, Message m
            WHERE p.user.id = :userId AND m.conversation = p.conversation
              AND m.sender.id <> :userId AND m.deletedAt IS NULL
              AND (p.lastReadMessageId IS NULL OR m.id > p.lastReadMessageId)
            """)
    long countUnreadConversations(@Param("userId") Long userId);
}
