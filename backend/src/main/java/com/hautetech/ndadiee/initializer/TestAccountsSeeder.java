package com.hautetech.ndadiee.initializer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.DeveloperRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Deux comptes d'essai pour se connecter pendant le développement : ada@example.com et
 * musa@example.com, avec le mot de passe dédié des comptes d'essai
 * (ndadiee.seed.test-account-password).
 *
 * <ul>
 * <li>Ils existent à chaque démarrage : créés s'il le faut, même dans une base déjà remplie (le reste
 * des données de démonstration, lui, n'est créé qu'une fois).</li>
 * <li>Leur mot de passe est toujours celui de la configuration : si elle change, le hachage stocké est
 * refait au démarrage suivant. Le mot de passe n'est jamais stocké ni journalisé en clair : seul son
 * hachage BCrypt va en base.</li>
 * <li>Les adresses sont en example.com, un domaine réservé aux exemples : elles n'appartiennent à
 * personne.</li>
 * <li>Créés seulement avec les données de démonstration (ndadiee.seed.enabled), donc jamais en
 * production, où SEED_ENABLED vaut false.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TestAccountsSeeder {

    private final DemoAccounts accounts;
    private final DeveloperRepository developerRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ndadiee.seed.test-account-password}")
    private String password;

    @Transactional
    public void seed() {
        ensure("ada", "Ada Nwosu", "NG", "Lagos", ExperienceLevel.MID, Language.EN, true,
                "Test account. Frontend developer in Lagos: React, TypeScript and interfaces that stay light on small data plans.",
                "React", "TypeScript", "CSS");
        ensure("musa", "Musa Diallo", "SN", "Dakar", ExperienceLevel.SENIOR, Language.FR, false,
                "Compte d'essai. Développeur back-end à Dakar : Java, Spring Boot et PostgreSQL, et des API qu'on lit sans documentation.",
                "Java", "Spring Boot", "PostgreSQL");
        log.info("[Init] Comptes d'essai prêts : ada@example.com, musa@example.com (mot de passe : ndadiee.seed.test-account-password)");
    }

    /** Le compte existe, et son mot de passe est celui de la configuration. */
    private void ensure(String username, String fullName, String country, String city, ExperienceLevel level,
            Language language, boolean openToWork, String bio, String... skills) {
        Long id = accounts.developer(username, fullName, Role.USER, country, city, level, language, openToWork, bio, skills);
        Developer developer = developerRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Compte d'essai introuvable : " + username));
        if (!passwordEncoder.matches(password, developer.getPassword())) {
            developer.setPassword(passwordEncoder.encode(password));
            developerRepository.save(developer);
            log.info("[Init] Compte d'essai {} : mot de passe remis à celui de la configuration", username);
        }
    }
}
