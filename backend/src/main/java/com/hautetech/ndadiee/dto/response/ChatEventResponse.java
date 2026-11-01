package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ce que le WebSocket pousse à un membre, sur /user/queue/chat. Seuls les champs de son type sont renseignés.
 *
 * <ul>
 * <li>MESSAGE_CREATED, MESSAGE_UPDATED : conversationId, message (modifié, ou supprimé : body null)</li>
 * <li>CONVERSATION_READ : conversationId, userId (qui a lu), lastReadMessageId</li>
 * <li>TYPING : conversationId, userId, typing</li>
 * <li>PRESENCE : userId, online</li>
 * </ul>
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatEventResponse {

    public enum Type { MESSAGE_CREATED, MESSAGE_UPDATED, CONVERSATION_READ, TYPING, PRESENCE }

    private Type type;
    private Long conversationId;
    private MessageResponse message;
    private Long userId;
    private Long lastReadMessageId;
    private Boolean typing;
    private Boolean online;

    public static ChatEventResponse messageCreated(MessageResponse message) {
        return builder().type(Type.MESSAGE_CREATED).conversationId(message.getConversationId()).message(message).build();
    }

    public static ChatEventResponse messageUpdated(MessageResponse message) {
        return builder().type(Type.MESSAGE_UPDATED).conversationId(message.getConversationId()).message(message).build();
    }

    public static ChatEventResponse read(Long conversationId, Long readerId, Long lastReadMessageId) {
        return builder().type(Type.CONVERSATION_READ).conversationId(conversationId).userId(readerId)
                .lastReadMessageId(lastReadMessageId).build();
    }

    public static ChatEventResponse typing(Long conversationId, Long userId, boolean typing) {
        return builder().type(Type.TYPING).conversationId(conversationId).userId(userId).typing(typing).build();
    }

    public static ChatEventResponse presence(Long userId, boolean online) {
        return builder().type(Type.PRESENCE).userId(userId).online(online).build();
    }
}
