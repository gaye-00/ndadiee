package com.hautetech.ndadiee.security;

import static org.springframework.security.config.Customizer.withDefaults;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
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
                //  PUBLIC — aucune authentification requise
                // ═══════════════════════════════════════════════════════════════

                // Auth
                .requestMatchers(HttpMethod.POST,
                    "/v1/auth/register",
                    "/v1/auth/login",
                    "/v1/auth/refresh"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/auth/username-availability").permitAll()

                // Médias servis par l'API (couvertures des projets de démonstration)
                .requestMatchers(HttpMethod.GET, "/media/**").permitAll()

                // Documentation Swagger
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()

                // ⚠️ Doit précéder la règle publique GET /v1/articles/{slug}
                .requestMatchers(HttpMethod.GET, "/v1/articles/me").authenticated()

                // Lecture publique du contenu de la communauté
                .requestMatchers(HttpMethod.GET,
                    "/v1/questions",
                    "/v1/questions/{slug}",
                    "/v1/questions/{id}/answers",
                    "/v1/articles",
                    "/v1/articles/{slug}",
                    "/v1/projects",
                    "/v1/projects/{slug}",
                    "/v1/projects/{id}/members",
                    "/v1/openings",
                    "/v1/openings/roles",
                    "/v1/openings/stacks",
                    "/v1/stats",
                    "/v1/opportunities",
                    "/v1/opportunities/{id}",
                    "/v1/tags",
                    "/v1/tags/{slug}",
                    "/v1/users",
                    "/v1/users/{username}",
                    "/v1/users/{username}/followers",
                    "/v1/users/{username}/following",
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
