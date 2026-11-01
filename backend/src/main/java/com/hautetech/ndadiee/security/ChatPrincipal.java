package com.hautetech.ndadiee.security;

import java.security.Principal;

import org.springframework.messaging.MessageDeliveryException;

/**
 * Le membre d'une session WebSocket, posé à la connexion STOMP (StompAuthenticationInterceptor). Son nom est son
 * identifiant : la messagerie lui écrit avec convertAndSendToUser(id, "/queue/chat", …).
 */
public record ChatPrincipal(Long userId) implements Principal {

    @Override
    public String getName() {
        return userId.toString();
    }

    /** L'identifiant du membre d'un message STOMP. Sans session authentifiée, le message est refusé. */
    public static Long idOf(Principal principal) {
        if (principal instanceof ChatPrincipal chat) {
            return chat.userId();
        }
        throw new MessageDeliveryException("UNAUTHORIZED");
    }
}
