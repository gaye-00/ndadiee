package com.hautetech.ndadiee.service.message;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.hautetech.ndadiee.dto.response.ChatEventResponse;
import com.hautetech.ndadiee.repository.ConversationParticipantRepository;
import com.hautetech.ndadiee.security.ChatPrincipal;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Qui est en ligne : un membre l'est tant qu'au moins une de ses sessions WebSocket est ouverte (un onglet, un
 * téléphone). Il arrive, ou s'en va de sa dernière session : les membres avec qui il a une conversation l'apprennent.
 *
 * En mémoire, comme le broker : suffisant pour un seul serveur. Plusieurs instances partageraient cet état (Redis).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceTracker {

    private final Map<Long, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
    private final Map<String, Long> userBySession = new ConcurrentHashMap<>();

    private final ConversationParticipantRepository participantRepository;
    private final ChatNotifier chatNotifier;

    public boolean isOnline(Long userId) {
        return sessionsByUser.containsKey(userId);
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        if (!(event.getUser() instanceof ChatPrincipal principal)) {
            return;
        }
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (sessionId != null && add(principal.userId(), sessionId)) {
            announce(principal.userId(), true);
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        Long userId = userBySession.remove(event.getSessionId());
        if (userId != null && remove(userId, event.getSessionId())) {
            announce(userId, false);
        }
    }

    /** @return true si c'est sa première session : il vient d'arriver */
    private boolean add(Long userId, String sessionId) {
        userBySession.put(sessionId, userId);
        AtomicBoolean first = new AtomicBoolean();
        sessionsByUser.compute(userId, (id, sessions) -> {
            Set<String> next = sessions == null ? ConcurrentHashMap.newKeySet() : sessions;
            first.set(next.isEmpty());
            next.add(sessionId);
            return next;
        });
        return first.get();
    }

    /** @return true si c'était sa dernière session : il vient de partir */
    private boolean remove(Long userId, String sessionId) {
        AtomicBoolean last = new AtomicBoolean();
        sessionsByUser.computeIfPresent(userId, (id, sessions) -> {
            sessions.remove(sessionId);
            last.set(sessions.isEmpty());
            return sessions.isEmpty() ? null : sessions;
        });
        return last.get();
    }

    private void announce(Long userId, boolean online) {
        try {
            chatNotifier.send(participantRepository.findContactIds(userId), ChatEventResponse.presence(userId, online));
        } catch (RuntimeException e) {
            log.warn("[Chat] Présence du membre {} non annoncée : {}", userId, e.getMessage());
        }
    }
}
