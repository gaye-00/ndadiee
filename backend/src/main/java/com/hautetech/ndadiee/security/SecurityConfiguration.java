package com.hautetech.ndadiee.security;

import static org.springframework.security.config.Customizer.withDefaults;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.hautetech.ndadiee.model.user.Permission;

import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
// @PreAuthorize sur les contrôleurs sensibles (back-office) : une seconde barrière derrière les règles d'URL
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthEntryPointHandleErrors authEntryPointHandleErrors;
    private final AccessDeniedHandleErrors accessDeniedHandleErrors;
    private final AuthenticationProvider authenticationProvider;

    @Value("${frontend.url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // API sans session ni cookie : le JWT voyage dans l'en-tête Authorization
            .csrf(csrf -> csrf.disable())
            .cors(withDefaults())
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()

                // ═══════════════════════════════════════════════════════════════
                //  ADMINISTRATION — comptes Admin seulement (permissions admin:*).
                //  En tête : aucune règle plus large ne doit s'appliquer avant.
                // ═══════════════════════════════════════════════════════════════
                .requestMatchers(HttpMethod.GET, "/v1/admin/**")
                    .hasAuthority(Permission.ADMIN_READ.getPermission())
                .requestMatchers(HttpMethod.DELETE, "/v1/admin/**")
                    .hasAuthority(Permission.ADMIN_DELETE.getPermission())
                .requestMatchers("/v1/admin/**")
                    .hasAuthority(Permission.ADMIN_UPDATE.getPermission())

                // ═══════════════════════════════════════════════════════════════
                //  PUBLIC — aucune authentification requise
                // ═══════════════════════════════════════════════════════════════

                // Auth
                .requestMatchers(HttpMethod.POST,
                    "/v1/auth/register",
                    "/v1/auth/login",
                    "/v1/auth/refresh",
                    // Le code reçu par e-mail à l'inscription
                    "/v1/auth/verify-email",
                    "/v1/auth/verify-email/resend",
                    // Mot de passe oublié : le code par e-mail, puis le nouveau mot de passe
                    "/v1/auth/password/forgot",
                    "/v1/auth/password/reset",
                    // Connexion avec GitHub ou Google : départ chez le fournisseur, puis retour avec son code
                    "/v1/auth/oauth/*/authorization",
                    "/v1/auth/oauth/*/login"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/auth/username-availability", "/v1/auth/oauth/providers").permitAll()

                // Médias servis par l'API (couvertures des projets de démonstration, images des membres sans R2)
                .requestMatchers(HttpMethod.GET, "/media/**", "/uploads/**").permitAll()

                // Poignée de main du WebSocket de la messagerie : le navigateur n'y pose pas d'en-tête, le JWT est
                // vérifié dans la trame STOMP CONNECT (StompAuthenticationInterceptor)
                .requestMatchers("/ws", "/ws/**").permitAll()

                // Documentation Swagger
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()

                // ⚠️ Doivent précéder les règles publiques GET /v1/articles/{slug}, /v1/hackathons/{slug}, /v1/questions/{slug}
                .requestMatchers(HttpMethod.GET, "/v1/articles/me", "/v1/hackathons/me", "/v1/questions/saved").authenticated()

                // Lecture publique du contenu de la communauté
                .requestMatchers(HttpMethod.GET,
                    "/v1/questions",
                    "/v1/questions/overview",
                    "/v1/questions/{slug}",
                    "/v1/questions/{id}/answers",
                    "/v1/articles",
                    "/v1/articles/{slug}",
                    "/v1/projects",
                    "/v1/projects/facets",
                    "/v1/projects/{slug}",
                    "/v1/projects/{slug}/code",
                    "/v1/projects/{slug}/code/file",
                    "/v1/projects/{id}/members",
                    "/v1/projects/{projectId}/devlog",
                    "/v1/projects/{projectId}/feedback-calls",
                    "/v1/openings",
                    "/v1/openings/facets",
                    "/v1/openings/roles",
                    "/v1/openings/stacks",
                    "/v1/openings/{id}",
                    "/v1/hackathons",
                    "/v1/hackathons/{slug}",
                    "/v1/hackathons/{id}/teams",
                    "/v1/stats",
                    "/v1/opportunities",
                    "/v1/opportunities/{id}",
                    "/v1/tags",
                    "/v1/tags/{slug}",
                    "/v1/users",
                    "/v1/users/{username}",
                    "/v1/users/{username}/followers",
                    "/v1/users/{username}/following",
                    "/v1/users/{username}/projects",
                    "/v1/users/{username}/collaborators",
                    "/v1/users/{username}/activity",
                    "/v1/comments",
                    "/v1/badges",
                    "/v1/search",
                    "/v1/feed"
                ).permitAll()

                // ═══════════════════════════════════════════════════════════════
                //  ÉCRITURE — permission selon le rôle. Les règles fines (auteur du
                //  contenu, modérateur...) sont vérifiées dans les services.
                // ═══════════════════════════════════════════════════════════════
                .requestMatchers(HttpMethod.POST, "/v1/**")
                    .hasAuthority(Permission.USER_CREATE.getPermission())
                .requestMatchers(HttpMethod.PUT, "/v1/**")
                    .hasAuthority(Permission.USER_UPDATE.getPermission())
                .requestMatchers(HttpMethod.PATCH, "/v1/**")
                    .hasAuthority(Permission.USER_UPDATE.getPermission())
                .requestMatchers(HttpMethod.DELETE, "/v1/**")
                    .hasAuthority(Permission.USER_DELETE.getPermission())

                // ═══════════════════════════════════════════════════════════════
                //  TOUT LE RESTE — authentifié
                // ═══════════════════════════════════════════════════════════════
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider)
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authEntryPointHandleErrors)
                .accessDeniedHandler(accessDeniedHandleErrors))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // frontendUrl (depuis l'environnement) + n'importe quel port local pour le développement
        configuration.setAllowedOriginPatterns(List.of(
            frontendUrl,
            "http://localhost:*"
        ));
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
