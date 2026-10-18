package com.hautetech.ndadiee.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.hautetech.ndadiee.model.user.User;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Intercepte chaque requête HTTP, lit le JWT de l'en-tête Authorization et, s'il est
 * valide, authentifie l'utilisateur pour la durée de la requête.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        final String authenticationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authenticationHeader == null || !authenticationHeader.startsWith(PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwtToken = authenticationHeader.substring(PREFIX.length());
        try {
            String username = jwtService.extractUsernameFromAccessToken(jwtToken);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                // Compte suspendu : ses jetons encore valides n'ouvrent plus rien. La requête continue en
                // visiteur ; sur un endpoint protégé, le 401 fait tenter un refresh, que AuthenticationService
                // refuse (ACCOUNT_BLOCKED) : le client ferme alors la session.
                if (!(userDetails instanceof User user && user.isBlocked())) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
            // Token expiré, malformé, falsifié, ou compte supprimé : événement banal, on continue
            // sans authentification — Spring Security renverra un 401 propre sur les endpoints
            // protégés (ce qui déclenche le refresh token côté client)
        }
        filterChain.doFilter(request, response);
    }
}
