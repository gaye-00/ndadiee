package com.hautetech.ndadiee.initializer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.service.badge.BadgeService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class InitializerNdadiee implements CommandLineRunner {

    private final BadgeService badgeService;
    private final DemoDataSeeder demoDataSeeder;
    private final ShowcaseSeeder showcaseSeeder;
    private final TestAccountsSeeder testAccountsSeeder;
    private final HackathonSeeder hackathonSeeder;

    @Value("${ndadiee.seed.enabled}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        // Données de référence : nécessaires dans tous les environnements
        badgeService.syncCatalog();

        if (seedEnabled) {
            // La communauté d'abord (comptes, questions, articles, opportunités), puis la vitrine,
            // dont les équipes et les étoiles viennent de cette communauté
            demoDataSeeder.seed();
            showcaseSeeder.seed();
            // Les deux comptes d'essai, à chaque démarrage, même dans une base déjà remplie
            testAccountsSeeder.seed();
            // Les hackathons et leurs équipes : des projets de la vitrine, et une équipe où joue musa
            hackathonSeeder.seed();
        } else {
            log.info("[Init] Données de démonstration désactivées (ndadiee.seed.enabled=false)");
        }
    }
}
