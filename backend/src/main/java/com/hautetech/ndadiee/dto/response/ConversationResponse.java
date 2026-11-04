package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une conversation, vue par l'un de ses deux membres. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationResponse {

    private Long id;

    // L'autre membre
    private UserSummaryResponse participant;

    // Connecté en ce moment (une application ouverte, reliée au WebSocket)
    private boolean online;

    // null tant que personne n'a écrit
    private MessageResponse lastMessage;

    // Messages reçus après lastReadMessageId
    private long unreadCount;

    // Le dernier message que j'ai lu, puis celui que l'autre a lu (« Vu »)
    private Long lastReadMessageId;
    private Long participantLastReadMessageId;

    private Instant lastMessageAt;
    private Instant createdAt;
}
