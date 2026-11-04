package com.hautetech.ndadiee.service.message;

import java.util.Collection;
import java.util.LinkedHashSet;

import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.hautetech.ndadiee.dto.response.ChatEventResponse;
import com.hautetech.ndadiee.event.ChatEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Pousse les événements de la messagerie dans la file WebSocket de chaque membre (/user/queue/chat), sur toutes ses
 * sessions ouvertes (un onglet, un téléphone…). Un membre sans session ouverte ne reçoit rien : il retrouvera tout à
 * sa prochaine visite, par l'API.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatNotifier {

    public static final String QUEUE = "/queue/chat";

    private final SimpMessagingTemplate messagingTemplate;

    public void send(Collection<Long> userIds, ChatEventResponse payload) {
        for (Long userId : new LinkedHashSet<>(userIds)) {
            try {
                messagingTemplate.convertAndSendToUser(userId.toString(), QUEUE, payload);
            } catch (MessagingException e) {
                // Le temps réel est un plus : l'échec d'une livraison n'annule rien de ce qui est enregistré
                log.warn("[Chat] {} non livré au membre {} : {}", payload.getType(), userId, e.getMessage());
            }
        }
    }

    /** Une fois la transaction validée (ou tout de suite, hors transaction). */
    @TransactionalEventListener(fallbackExecution = true)
    public void onChatEvent(ChatEvent event) {
        send(event.recipientIds(), event.payload());
    }
}
