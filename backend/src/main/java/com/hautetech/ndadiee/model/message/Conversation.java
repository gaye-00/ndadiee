package com.hautetech.ndadiee.model.message;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Conversation privée entre deux membres. Ses deux participants ({@link ConversationParticipant}) gardent chacun où ils
 * en sont de leur lecture ; ses messages ({@link Message}) sont lus par tranches, des plus récents aux plus anciens.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "conversations",
    uniqueConstraints = @UniqueConstraint(name = "uk_conversations_direct_key", columnNames = "direct_key"),
    indexes = @Index(name = "idx_conversations_last_message", columnList = "last_message_at")
)
public class Conversation extends BaseEntity {

    /**
     * Les deux membres, du plus petit identifiant au plus grand (« 12:34 »). Unique : deux membres n'ont qu'une
     * conversation, quel que soit celui qui écrit le premier.
     */
    @Column(nullable = false, length = 41)
    private String directKey;

    // Celui qui l'a ouverte : elle n'apparaît chez l'autre qu'au premier message
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Developer createdBy;

    // Le dernier message : trie la liste des conversations. Null tant que personne n'a écrit
    private Instant lastMessageAt;

    public static String directKey(Long first, Long second) {
        return Math.min(first, second) + ":" + Math.max(first, second);
    }
}
