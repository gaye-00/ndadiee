package com.hautetech.ndadiee.initializer;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.UpdateProfileRequest;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Admin;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;

/**
 * Comptes de démonstration, partagés par les seeders : retrouvés par leur identifiant s'ils
 * existent déjà, créés avec leur profil sinon. Les adresses sont en example.com.
 */
@Component
@RequiredArgsConstructor
public class DemoAccounts {

    private final UserRepository userRepository;
    private final DeveloperRepository developerRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Value("${ndadiee.seed.admin-password}")
    private String adminPassword;

    @Value("${ndadiee.seed.demo-password}")
    private String demoPassword;

    // Tous les comptes de démonstration partagent le même mot de passe : on ne le hache qu'une fois
    private String encodedDemoPassword;

    public Long admin() {
        return userRepository.findByUsername("admin")
                .map(User::getId)
                .orElseGet(() -> userRepository.save(Admin.builder()
                        .username("admin")
                        .email("admin@example.com")
                        .password(passwordEncoder.encode(adminPassword))
                        .fullName("Équipe Ndadiee")
                        .role(Role.ADMIN)
                        .build()).getId());
    }

    public Long developer(String username, String fullName, Role role, String country, String city,
            ExperienceLevel level, Language language, boolean openToWork, String bio, String... skills) {
        Optional<Developer> existing = developerRepository.findByUsername(username);
        if (existing.isPresent()) {
            return existing.get().getId();
        }
        if (encodedDemoPassword == null) {
            encodedDemoPassword = passwordEncoder.encode(demoPassword);
        }

        Long id = developerRepository.save(Developer.builder()
                .username(username)
                .email(username.replace('_', '.') + "@example.com")
                .password(encodedDemoPassword)
                .fullName(fullName)
                .role(role)
                .build()).getId();

        userService.updateProfile(id, UpdateProfileRequest.builder()
                .fullName(fullName)
                .bio(bio)
                .country(country)
                .city(city)
                .preferredLanguage(language)
                .level(level)
                .openToWork(openToWork)
                .skills(List.of(skills))
                .build());
        return id;
    }

    /** Identifiant d'un compte qui doit déjà exister (créé par DemoDataSeeder). */
    public Long id(String username) {
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new IllegalStateException("Compte de démonstration introuvable : " + username));
    }
}
