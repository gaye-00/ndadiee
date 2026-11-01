package com.hautetech.ndadiee.controller;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.hautetech.ndadiee.security.ChatPrincipal;
import com.hautetech.ndadiee.service.message.MessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Ce que l'application écrit sur le WebSocket (destinations /app/…) : rien d'enregistré, que de l'instantané. */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final MessageService messageService;

    public record TypingRequest(boolean typing) {
    }

    /** « En train d'écrire » : l'application l'envoie quand la saisie commence, puis au plus toutes les quelques secondes. */
    @MessageMapping("/conversations/{conversationId}/typing")
    public void typing(@DestinationVariable Long conversationId, @Payload TypingRequest request, Principal principal) {
        messageService.typing(ChatPrincipal.idOf(principal), conversationId, request.typing());
    }

    // Un signal perdu n'a pas d'importance : on le note, sans erreur pour la session
    @MessageExceptionHandler
    public void onError(Exception e) {
        log.debug("[Chat] Signal WebSocket ignoré : {}", e.getMessage());
    }
}
