package com.hautetech.ndadiee.security;

import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;

/**
 * Garde l'entrée du WebSocket. Le navigateur ne peut pas poser d'en-tête sur la poignée de main HTTP : le JWT voyage
 * dans la trame STOMP CONNECT (en-tête Authorization), comme pour l'API.
 *
 * <ul>
 * <li>CONNECT : un access token valide, d'un membre de la communauté non suspendu ; sinon la connexion est refusée
 * avec le message UNAUTHORIZED (l'application renouvelle alors sa session et se reconnecte).</li>
 * <li>SUBSCRIBE : seulement à ses propres files (/user/queue/…), jamais aux destinations du broker.</li>
 * <li>SEND : seulement aux contrôleurs (/app/…). Sans cette règle, une session pourrait écrire directement dans la file
 * d'un autre membre (/user/42/queue/chat) et y glisser de faux événements.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class StompAuthenticationInterceptor implements ChannelInterceptor {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final DeveloperRepository developerRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            accessor.setUser(authenticate(accessor));
        } else if (command == StompCommand.SUBSCRIBE) {
            requireSession(accessor);
            requireDestination(accessor, "/user/queue/");
        } else if (command == StompCommand.SEND) {
            requireSession(accessor);
            requireDestination(accessor, "/app/");
        }
        return message;
    }

    private ChatPrincipal authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(PREFIX)) {
            throw new MessageDeliveryException("UNAUTHORIZED");
        }
        try {
            String username = jwtService.extractUsernameFromAccessToken(header.substring(PREFIX.length()));
            // Un compte Admin n'a pas de messagerie ; un compte suspendu n'ouvre plus rien
            Developer developer = developerRepository.findByUsername(username)
                    .filter(account -> !account.isBlocked())
                    .orElseThrow(() -> new MessageDeliveryException("UNAUTHORIZED"));
            return new ChatPrincipal(developer.getId());
        } catch (JwtException | IllegalArgumentException e) {
            throw new MessageDeliveryException("UNAUTHORIZED");
        }
    }

    private static void requireSession(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof ChatPrincipal)) {
            throw new MessageDeliveryException("UNAUTHORIZED");
        }
    }

    private static void requireDestination(StompHeaderAccessor accessor, String prefix) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(prefix)) {
            throw new MessageDeliveryException("FORBIDDEN_DESTINATION");
        }
    }
}
