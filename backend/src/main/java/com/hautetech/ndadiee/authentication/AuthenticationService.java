package com.hautetech.ndadiee.authentication;

import java.util.Set;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.exception.DuplicateResourceException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.exception.UnauthorizedException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.security.JwtService;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AuthenticationService {

    // Noms qui entreraient en collision avec des routes (/users/me, /articles/me...) ou prêteraient à confusion
    private static final Set<String> RESERVED_USERNAMES = Set.of(
            "me", "admin", "administrator", "moderator", "ndadiee", "support", "system", "root", "api");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    public AuthenticationResponse register(RegisterRequest request) {
        String username = normalize(request.getUsername());
        String email = normalize(request.getEmail());

        if (RESERVED_USERNAMES.contains(username)) {
            throw new OperationNotAllowedException("Ce nom d'utilisateur est réservé");
        }
        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Utilisateur", "nom d'utilisateur", username);
        }
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Utilisateur", "email", email);
        }

        Developer developer = Developer.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .country(request.getCountry() == null ? null : request.getCountry().toUpperCase())
                .preferredLanguage(request.getPreferredLanguage() == null ? Language.FR : request.getPreferredLanguage())
                .role(Role.USER)
                .build();

        Developer saved = userRepository.save(developer);
        log.info("[Auth] Inscription - ID: {} - username: {}", saved.getId(), saved.getUsername());
        return buildResponse(saved);
    }

    public AuthenticationResponse login(AuthenticationRequest request) {
        // Lève BadCredentialsException (→ 401) si l'identifiant ou le mot de passe est faux
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalize(request.getIdentifier()), request.getPassword()));

        User user = (User) authentication.getPrincipal();
        log.info("[Auth] Connexion - ID: {} - username: {}", user.getId(), user.getUsername());
        return buildResponse(user);
    }

    /** Échange un refresh token valide contre une nouvelle paire de jetons. */
    public AuthenticationResponse refreshToken(RefreshTokenRequest request) {
        String username;
        try {
            username = jwtService.extractUsernameFromRefreshToken(request.getRefreshToken());
        } catch (JwtException | IllegalArgumentException e) {
            throw new UnauthorizedException("Refresh token invalide ou expiré");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("Refresh token invalide ou expiré"));
        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        return userMapper.toUserResponse(user);
    }

    // ==================== HELPERS ====================

    private AuthenticationResponse buildResponse(User user) {
        return AuthenticationResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .user(userMapper.toUserResponse(user))
                .build();
    }

    // Emails et noms d'utilisateur sont stockés et comparés en minuscules
    private String normalize(String value) {
        return value.trim().toLowerCase();
    }
}
