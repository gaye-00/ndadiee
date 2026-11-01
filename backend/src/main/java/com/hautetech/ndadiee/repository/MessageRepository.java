package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.message.Message;

public interface MessageRepository extends JpaRepository<Message, Long> {

    // Les tranches d'une conversation, des plus récents aux plus anciens : la dernière, puis avant un message donné
    List<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long before, Pageable pageable);

    Optional<Message> findByIdAndConversationId(Long id, Long conversationId);

    Optional<Message> findTopByConversationIdOrderByIdDesc(Long conversationId);

    // Un envoi répété : le message déjà enregistré
    Optional<Message> findBySenderIdAndClientId(Long senderId, String clientId);

    /** Le dernier message de chacune de ces conversations (l'aperçu de la liste). */
    @Query("""
            SELECT m FROM Message m
            WHERE m.id IN (SELECT MAX(last.id) FROM Message last WHERE last.conversation.id IN :conversationIds GROUP BY last.conversation.id)
            """)
    List<Message> findLastMessages(@Param("conversationIds") Collection<Long> conversationIds);

    /**
     * Les messages reçus et pas encore lus, conversation par conversation : [identifiant de la conversation, nombre].
     */
    @Query("""
            SELECT m.conversation.id, COUNT(m) FROM Message m, ConversationParticipant p
            WHERE p.user.id = :userId AND p.conversation.id IN :conversationIds AND m.conversation = p.conversation
              AND m.sender.id <> :userId AND m.deletedAt IS NULL
              AND (p.lastReadMessageId IS NULL OR m.id > p.lastReadMessageId)
            GROUP BY m.conversation.id
            """)
    List<Object[]> countUnread(@Param("userId") Long userId, @Param("conversationIds") Collection<Long> conversationIds);
}
