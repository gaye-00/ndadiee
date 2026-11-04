package com.hautetech.ndadiee.model.message;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.CheckConstraint;
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
 * Un message d'une conversation privée. Son auteur peut le modifier (il porte alors la date de la modification) ou le
 * supprimer : le texte est effacé, la place du message reste (« Message supprimé »).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "messages",
    // Un envoi répété (réseau coupé avant la réponse) ne crée pas de doublon : même auteur, même identifiant client
    uniqueConstraints = @UniqueConstraint(name = "uk_messages_sender_client", columnNames = { "sender_id", "client_id" }),
    // Les tranches d'une conversation, des plus récents aux plus anciens
    indexes = @Index(name = "idx_messages_conversation", columnList = "conversation_id, id"),
    // Un message supprimé perd son texte ; les autres en ont un
    check = @CheckConstraint(name = "ck_messages_body", constraint = "body is not null or deleted_at is not null"))
public class Message extends BaseEntity {

    public static final int MAX_LENGTH = 4000;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Developer sender;

    // Effacé quand le message est supprimé
    @Column(columnDefinition = "TEXT")
    private String body;

    // Identifiant choisi par l'application qui envoie (UUID) : elle reconnaît son message quand il revient par le WebSocket
    @Column(name = "client_id", length = 36)
    private String clientId;

    private Instant editedAt;

    private Instant deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
