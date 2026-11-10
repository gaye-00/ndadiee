package com.hautetech.ndadiee.authentication.oauth;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.authentication.AuthenticationService;
import com.hautetech.ndadiee.authentication.verification.EmailVerificationService;
import com.hautetech.ndadiee.exception.OAuthException;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.OAuthProvider;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.model.user.UserIdentity;
import com.hautetech.ndadiee.repository.UserIdentityRepository;
import com.hautetech.ndadiee.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le compte Ndadiee d'un membre connecté chez GitHub ou Google : retrouvé par son identité déjà reliée ; sinon par
 * l'adresse e-mail que le fournisseur a vérifiée, et l'identité y est reliée ; sinon créé. Un compte d'administration
 * ne s'ouvre qu'avec son mot de passe.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class OAuthAccountService {

    private static final int URL_MAX = 500;
    private static final int NAME_MAX = 100;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;
    private final AuthenticationService authenticationService;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;

    /**
     * Ouvre une session sur le compte du membre décrit par le fournisseur, créé au besoin.
     *
     * @param language la langue de l'interface, pour un compte créé à cette occasion
     */
    public AuthenticationResponse signIn(OAuthProfile profile, Language language) {
        User user = identityRepository.findByProviderAndSubject(profile.provider(), profile.subject())
                .map(identity -> {
                    if (profile.email() != null) {
                        identity.setEmail(normalize(profile.email()));
                    }
                    return identity.getUser();
                })
                .orElseGet(() -> linkOrCreate(profile, language));
        // Un compte suspendu n'ouvre pas de session : l'exception défait aussi la liaison ou la création
        AuthenticationResponse session = authenticationService.openSession(user);
        log.info("[Auth] Connexion avec {} - ID: {} - username: {}",
                profile.provider().displayName(), user.getId(), user.getUsername());
        return session;
    }

    private User linkOrCreate(OAuthProfile profile, Language language) {
        // Sans adresse vérifiée, ni compte à retrouver, ni compte à créer (l'e-mail est requis)
        if (profile.email() == null) {
            throw OAuthException.emailRequired(profile.provider());
        }
        String email = normalize(profile.email());
        User user = userRepository.findByEmail(email)
                .map(existing -> adopt(existing, profile))
                .orElseGet(() -> create(profile, email, language));
        identityRepository.save(UserIdentity.builder()
                .user(user)
                .provider(profile.provider())
                .subject(profile.subject())
                .email(email)
                .build());
        return user;
    }

    // Un compte existe déjà avec l'adresse que le fournisseur a vérifiée : c'est le même membre, son identité y est reliée
    private User adopt(User user, OAuthProfile profile) {
        if (!(user instanceof Developer developer)) {
            throw OAuthException.adminAccount();
        }
        if (identityRepository.existsByUserIdAndProvider(developer.getId(), profile.provider())) {
            throw OAuthException.alreadyLinked(profile.provider());
        }
        // Inscription jamais confirmée par le code : n'importe qui a pu la lancer avec cette adresse. Le fournisseur
        // prouve que l'adresse est à ce membre ; le mot de passe choisi par l'inconnu ne sert plus à rien
        if (!developer.isEmailVerified()) {
            developer.setEmailVerified(true);
            developer.setPassword(passwordEncoder.encode(randomSecret()));
            developer.setPasswordSet(false);
            emailVerificationService.discard(developer);
            log.info("[Auth] Inscription en attente confirmée par {} (mot de passe remplacé) - ID: {}",
                    profile.provider().displayName(), developer.getId());
        }
        // Seulement ce que le membre n'a pas encore renseigné
        if (developer.getAvatarUrl() == null) {
            developer.setAvatarUrl(url(profile.avatarUrl()));
        }
        if (profile.provider() == OAuthProvider.GITHUB && developer.getGithubUrl() == null) {
            developer.setGithubUrl(url(profile.profileUrl()));
        }
        log.info("[Auth] Compte {} relié - ID: {} - username: {}",
                profile.provider().displayName(), developer.getId(), developer.getUsername());
        return developer;
    }

    private Developer create(OAuthProfile profile, String email, Language language) {
        String hint = profile.usernameHint() != null ? profile.usernameHint() : email.substring(0, email.indexOf('@'));
        String username = authenticationService.freeUsername(hint);
        String fullName = profile.fullName() != null ? profile.fullName() : username;
        Developer developer = Developer.builder()
                .username(username)
                .email(email)
                // Le compte s'ouvre avec le fournisseur : son mot de passe est un secret aléatoire, que personne ne connaît
                .password(passwordEncoder.encode(randomSecret()))
                .passwordSet(false)
                .fullName(fullName.length() > NAME_MAX ? fullName.substring(0, NAME_MAX) : fullName)
                .avatarUrl(url(profile.avatarUrl()))
                .githubUrl(profile.provider() == OAuthProvider.GITHUB ? url(profile.profileUrl()) : null)
                .preferredLanguage(language == null ? Language.FR : language)
                .role(Role.USER)
                .build();
        Developer saved = userRepository.save(developer);
        log.info("[Auth] Inscription avec {} - ID: {} - username: {}",
                profile.provider().displayName(), saved.getId(), saved.getUsername());
        return saved;
    }

    // Une adresse trop longue pour la colonne est ignorée plutôt que tronquée (elle ne mènerait plus nulle part)
    private static String url(String value) {
        return value == null || value.length() > URL_MAX ? null : value;
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
