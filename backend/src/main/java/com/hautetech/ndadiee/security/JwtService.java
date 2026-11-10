package com.hautetech.ndadiee.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Émet et vérifie les JWT. Deux types de jetons, distingués par le claim "type" :
 * l'access token (court) authentifie les requêtes, le refresh token (long) ne sert
 * qu'à obtenir un nouvel access token.
 */
@Service
public class JwtService {

    private static final String TYPE_CLAIM = "type";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final SecretKey key;
    private final Duration accessTokenExpiration;
    private final Duration refreshTokenExpiration;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration}") Duration accessTokenExpiration,
            @Value("${jwt.refresh-token-expiration}") Duration refreshTokenExpiration) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(userDetails, ACCESS, accessTokenExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails, REFRESH, refreshTokenExpiration);
    }

    /** Ce que porte un jeton vérifié : son titulaire, et quand il a été émis (à la seconde) */
    public record TokenClaims(String username, Instant issuedAt) {
    }

    /**
     * @throws JwtException si le jeton est expiré, falsifié, mal formé, ou n'est pas un access token
     */
    public TokenClaims parseAccessToken(String token) {
        return parse(token, ACCESS);
    }

    /**
     * @throws JwtException si le jeton est expiré, falsifié, mal formé, ou n'est pas un refresh token
     */
    public TokenClaims parseRefreshToken(String token) {
        return parse(token, REFRESH);
    }

    /**
     * @return le nom d'utilisateur porté par l'access token
     * @throws JwtException si le jeton est expiré, falsifié, mal formé, ou n'est pas un access token
     */
    public String extractUsernameFromAccessToken(String token) {
        return extractUsername(token, ACCESS);
    }

    /**
     * @return le nom d'utilisateur porté par le refresh token
     * @throws JwtException si le jeton est expiré, falsifié, mal formé, ou n'est pas un refresh token
     */
    public String extractUsernameFromRefreshToken(String token) {
        return extractUsername(token, REFRESH);
    }

    private String extractUsername(String token, String expectedType) {
        return parse(token, expectedType).username();
    }

    private TokenClaims parse(String token, String expectedType) {
        // parseSignedClaims vérifie la signature et la date d'expiration
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        if (!expectedType.equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new JwtException("Type de jeton inattendu");
        }
        return new TokenClaims(claims.getSubject(), claims.getIssuedAt() == null ? null : claims.getIssuedAt().toInstant());
    }

    private String buildToken(UserDetails userDetails, String type, Duration validity) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim(TYPE_CLAIM, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(validity)))
                .signWith(key)
                .compact();
    }
}
