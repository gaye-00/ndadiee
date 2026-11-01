package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageResponse {

    private Long id;
    private Long conversationId;
    private Long senderId;

    // null pour un message supprimé
    private String body;

    // L'identifiant choisi par l'application qui l'a envoyé : elle y reconnaît son message
    private String clientId;

    private boolean deleted;
    private Instant editedAt;
    private Instant createdAt;
}
