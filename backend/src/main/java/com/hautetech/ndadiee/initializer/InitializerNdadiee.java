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

    @Value("${ndadiee.seed.enabled}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        // Données de référence : nécessaires dans tous les environnements
        badgeService.syncCatalog();

        if (seedEnabled) {
            demoDataSeeder.seedIfEmpty();
        } else {
            log.info("[Init] Données de démonstration désactivées (ndadiee.seed.enabled=false)");
        }
    }
}
