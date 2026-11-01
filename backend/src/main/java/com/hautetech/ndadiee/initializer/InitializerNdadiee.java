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
    private final ForumSeeder forumSeeder;
    private final HackathonSeeder hackathonSeeder;
    private final ModerationSeeder moderationSeeder;
    private final DashboardSeeder dashboardSeeder;
    private final ReviewSeeder reviewSeeder;
    private final GithubDemoSeeder githubDemoSeeder;

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
            // Le forum : des sujets sur trois semaines, où les comptes d'essai posent, répondent et enregistrent
            forumSeeder.seed();
            // Les hackathons et leurs équipes : des projets de la vitrine, et une équipe où joue musa
            hackathonSeeder.seed();
            // Le back-office : un compte de spam suspendu, ses contenus masqués, une modératrice nommée
            moderationSeeder.seed();
            // L'atelier des comptes d'essai : leurs équipes, les candidatures qui les attendent
            dashboardSeeder.seed();
            // Les revues de code : des pull requests dans les projets, à relire par l'équipe et la communauté
            reviewSeeder.seed();
            // De vrais dépôts GitHub : leurs pull requests arrivent à la première synchronisation
            githubDemoSeeder.seed();
        } else {
            log.info("[Init] Données de démonstration désactivées (ndadiee.seed.enabled=false)");
        }
    }
}
