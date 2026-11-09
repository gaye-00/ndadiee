package com.hautetech.ndadiee.authentication;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.authentication.UsernameAvailabilityResponse.Reason;
import com.hautetech.ndadiee.exception.AccountBlockedException;
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
    // Même règle que RegisterRequest, sur le nom déjà mis en minuscules
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9_]{3,30}$");
    // Variantes libres proposées pour un nom pris
    static final int SUGGESTIONS = 3;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    public AuthenticationResponse register(RegisterRequest request) {
        String username = normalize(request.getUsername());
        String email = normalize(request.getEmail());

        // Le champ en cause accompagne chaque refus : le formulaire l'affiche au bon endroit
        if (RESERVED_USERNAMES.contains(username)) {
            throw new OperationNotAllowedException("Ce nom d'utilisateur est réservé", "username");
        }
        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Utilisateur", "nom d'utilisateur", username, "username");
        }
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Utilisateur", "email", email, "email");
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
        // Après le mot de passe : seul le titulaire du compte apprend qu'il est suspendu
        AuthenticationResponse session = openSession(user);
        log.info("[Auth] Connexion - ID: {} - username: {}", user.getId(), user.getUsername());
        return session;
    }

    /**
     * Ouvre une session sur un compte dont l'identité est établie (mot de passe vérifié, ou compte GitHub ou Google
     * relié) : refusée si le compte est suspendu.
     */
    public AuthenticationResponse openSession(User user) {
        requireActive(user);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        return buildResponse(user);
    }

    /**
     * Un nom d'utilisateur libre, tiré d'un nom proposé (le pseudo GitHub, le début d'une adresse e-mail) : ramené à
     * la règle des noms (minuscules, chiffres et _, de 3 à 30 caractères), puis décliné s'il est réservé ou pris.
     */
    public String freeUsername(String hint) {
        String base = Normalizer.normalize(hint == null ? "" : hint, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        if (base.length() > 30) {
            base = base.substring(0, 30).replaceAll("_$", "");
        }
        if (base.length() < 3) {
            base = base.isEmpty() ? "dev" : base + "_dev";
        }
        if (!RESERVED_USERNAMES.contains(base) && !userRepository.existsByUsername(base)) {
            return base;
        }
        List<String> variants = freeVariants(base);
        if (!variants.isEmpty()) {
            return variants.getFirst();
        }
        // Toutes les variantes courtes sont prises : un suffixe plus long finit toujours par être libre
        String stem = base.length() > 23 ? base.substring(0, 23) : base;
        String candidate;
        do {
            candidate = stem + "_" + ThreadLocalRandom.current().nextInt(100_000, 1_000_000);
        } while (userRepository.existsByUsername(candidate));
        return candidate;
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
        // Suspendu depuis la connexion : la session ne se renouvelle plus
        requireActive(user);
        return buildResponse(user);
    }

    /**
     * Un nom d'utilisateur est-il libre ? Vérifié pendant l'inscription, à la frappe. S'il est réservé
     * ou déjà pris, quelques variantes libres l'accompagnent (« awa_dev », « awa221 »).
     */
    @Transactional(readOnly = true)
    public UsernameAvailabilityResponse checkUsername(String requested) {
        String username = normalize(requested);
        if (!USERNAME.matcher(username).matches()) {
            return unavailable(username, Reason.INVALID, List.of());
        }
        if (RESERVED_USERNAMES.contains(username)) {
            return unavailable(username, Reason.RESERVED, freeVariants(username));
        }
        if (userRepository.existsByUsername(username)) {
            return unavailable(username, Reason.TAKEN, freeVariants(username));
        }
        return UsernameAvailabilityResponse.builder().username(username).available(true).suggestions(List.of()).build();
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        return userMapper.toUserResponse(user);
    }

    // ==================== HELPERS ====================

    private void requireActive(User user) {
        if (user.isBlocked()) {
            log.info("[Auth] Compte suspendu, session refusée - ID: {}", user.getId());
            throw new AccountBlockedException(user.getBlockedReason());
        }
    }

    private AuthenticationResponse buildResponse(User user) {
        return AuthenticationResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .user(userMapper.toUserResponse(user))
                .build();
    }

    private static UsernameAvailabilityResponse unavailable(String username, Reason reason, List<String> suggestions) {
        return UsernameAvailabilityResponse.builder()
                .username(username)
                .available(false)
                .reason(reason)
                .suggestions(suggestions)
                .build();
    }

    // Variantes d'un nom, dans la limite de 30 caractères : « _dev », deux chiffres, « _ » et deux chiffres
    private List<String> freeVariants(String username) {
        String base = username.length() > 26 ? username.substring(0, 26) : username;
        ThreadLocalRandom random = ThreadLocalRandom.current();
        List<String> candidates = List.of(
                base + "_dev",
                base + random.nextInt(10, 100),
                base + "_" + random.nextInt(10, 100),
                base + random.nextInt(100, 1000),
                base + "_" + random.nextInt(100, 1000));
        List<String> free = new ArrayList<>();
        for (String candidate : candidates) {
            if (free.size() == SUGGESTIONS) {
                break;
            }
            if (!free.contains(candidate) && !RESERVED_USERNAMES.contains(candidate)
                    && !userRepository.existsByUsername(candidate)) {
                free.add(candidate);
            }
        }
        return free;
    }

    // Emails et noms d'utilisateur sont stockés et comparés en minuscules
    private String normalize(String value) {
        return value.trim().toLowerCase();
    }
}
