package com.hautetech.ndadiee.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import com.hautetech.ndadiee.security.StompAuthenticationInterceptor;

/**
 * Le WebSocket de la messagerie : STOMP sur ws://…/api/ws.
 *
 * <ul>
 * <li>Chaque membre reçoit ses événements sur sa file, /user/queue/chat (nouveaux messages, accusés de lecture, saisie
 * en cours, présence). Les messages eux-mêmes s'envoient par l'API REST : validés, enregistrés, puis annoncés.</li>
 * <li>L'application écrit aux contrôleurs sous /app (« en train d'écrire »).</li>
 * <li>Broker en mémoire : il suffit à un seul serveur. Pour plusieurs instances, un relais vers RabbitMQ ou ActiveMQ
 * (enableStompBrokerRelay) prendrait sa place sans changer le reste.</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Battements de cœur dans les deux sens : une connexion coupée sans prévenir (réseau mobile) se détecte en ~20 s
    private static final long HEARTBEAT_MS = 10_000;

    private final StompAuthenticationInterceptor authenticationInterceptor;
    private final TaskScheduler heartbeatScheduler;
    private final String frontendUrl;

    public WebSocketConfig(
            StompAuthenticationInterceptor authenticationInterceptor,
            // Celui du broker, déclaré par @EnableWebSocketMessageBroker ; @Lazy : il est créé par cette configuration
            @Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler heartbeatScheduler,
            @Value("${frontend.url}") String frontendUrl) {
        this.authenticationInterceptor = authenticationInterceptor;
        this.heartbeatScheduler = heartbeatScheduler;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Mêmes origines que l'API (SecurityConfiguration) : le front, et n'importe quel port local en développement
        registry.addEndpoint("/ws").setAllowedOriginPatterns(frontendUrl, "http://localhost:*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        registry.enableSimpleBroker("/queue")
                .setHeartbeatValue(new long[] { HEARTBEAT_MS, HEARTBEAT_MS })
                .setTaskScheduler(heartbeatScheduler);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authenticationInterceptor);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Les trames entrantes sont petites (« en train d'écrire ») ; un client trop lent est déconnecté plutôt que de
        // faire grossir la mémoire du serveur
        registration.setMessageSizeLimit(16 * 1024)
                .setSendBufferSizeLimit(512 * 1024)
                .setSendTimeLimit(15_000);
    }
}
