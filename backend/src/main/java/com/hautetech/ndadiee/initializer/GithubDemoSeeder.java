package com.hautetech.ndadiee.initializer;

import java.util.List;

import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Trois projets reliés à de vrais dépôts publics, pour relire du vrai code : leurs pull requests arrivent de GitHub
 * (PullRequestSyncService) une trentaine de secondes après le démarrage, si GITHUB_TOKEN est défini.
 *
 * <ul>
 * <li>ada porte le dossier patient d'OpenMRS 3 (React, TypeScript) : ses PR sont dans son onglet Équipe, et dans
 * l'onglet Communauté de musa.</li>
 * <li>musa porte le cœur d'OpenMRS (Java, Spring) : l'inverse.</li>
 * <li>Wanjiru, à Nairobi, porte le client web d'Ushahidi : ses PR sont communautaires pour ada comme pour musa.</li>
 * </ul>
 *
 * Aucun appel à GitHub ici : le démarrage n'attend pas le réseau. Ne s'exécute que si ces projets n'existent pas.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GithubDemoSeeder {

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final SlugService slugService;

    public void seed() {
        if (projectRepository.findBySlug(slugService.toSlug("OpenMRS Patient Chart")).isPresent()) {
            log.info("[Init] Projets reliés à GitHub déjà créés, skip.");
            return;
        }
        log.info("[Init] Projets reliés à de vrais dépôts GitHub...");

        project(accounts.id("ada"), "OpenMRS Patient Chart", "https://github.com/openmrs/openmrs-esm-patient-chart", "MPL-2.0",
                DemoCover.of("openmrs-patient-chart", "Francisco Júnior / VOA", "domaine public",
                        "Hospital_Rural_de_Nhamatanda,_Sofala,_Mozambique,_VOA.jpg"),
                "Le dossier patient d'OpenMRS 3 : constantes, ordonnances, résultats et notes de consultation.",
                """
                Le dossier patient d'**OpenMRS 3**, le dossier médical open source utilisé dans des centaines d'hôpitaux et de centres de santé, du Kenya au Mozambique.

                - Des micro-frontends React : constantes, allergies, ordonnances, résultats d'analyses
                - Pensé pour les connexions lentes et les postes partagés

                Dépôt réel : ses pull requests sont lues sur GitHub et ouvertes à la revue de la communauté.
                """,
                "React", "TypeScript", "Santé");
        project(accounts.id("musa"), "OpenMRS Core", "https://github.com/openmrs/openmrs-core", "MPL-2.0",
                DemoCover.of("openmrs-core", "Mike Rosenberg", "CC BY 2.0", "Hospital_Central_de_Maputo_(503927723).jpg"),
                "Le cœur d'OpenMRS : le modèle de données médical et l'API sur lesquels reposent tous ses modules.",
                """
                Le cœur d'**OpenMRS** : patients, visites, observations et concepts médicaux, et l'API Java sur laquelle reposent tous ses modules.

                - Java et Spring, Hibernate, Liquibase
                - Une base de concepts partagée entre pays

                Dépôt réel : ses pull requests sont lues sur GitHub et ouvertes à la revue de la communauté.
                """,
                "Java", "Spring", "Santé");
        project(accounts.id("wanjiru_kamau"), "Ushahidi Platform", "https://github.com/ushahidi/platform-client-mzima", null,
                DemoCover.of("ushahidi-platform", "Lmwangi", "CC BY-SA 3.0", "Nairobi_skyline_P1000019.jpg"),
                "Le client web d'Ushahidi : cartographier les témoignages pendant une crise ou une élection.",
                """
                **Ushahidi** (« témoignage » en swahili) est né à Nairobi en 2008 pour cartographier les violences post-électorales. Mzima est son nouveau client web.

                - Angular et TypeScript
                - Cartes, enquêtes et collecte par SMS

                Dépôt réel : ses pull requests sont lues sur GitHub et ouvertes à la revue de la communauté.
                """,
                "Angular", "TypeScript", "Civic tech");
        log.info("[Init] Projets reliés à GitHub créés : leurs pull requests arrivent à la première synchronisation");
    }

    private void project(Long ownerId, String name, String repositoryUrl, String license, DemoCover cover, String tagline,
            String description, String... tags) {
        projectService.create(ownerId, cover.applyTo(ProjectRequest.builder())
                .name(name)
                .tagline(tagline)
                .description(description.strip())
                .repositoryUrl(repositoryUrl)
                .license(license)
                .lookingForContributors(true)
                .tags(List.of(tags))
                .build());
    }
}
