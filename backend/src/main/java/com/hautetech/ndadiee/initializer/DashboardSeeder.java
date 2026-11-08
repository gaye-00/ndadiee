package com.hautetech.ndadiee.initializer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.DevlogEntryRequest;
import com.hautetech.ndadiee.dto.request.JoinProjectRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.MemberSpecialtyRequest;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.project.DevlogService;
import com.hautetech.ndadiee.service.project.GithubActivityService;
import com.hautetech.ndadiee.service.project.ProjectOpeningService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * L'atelier des comptes d'essai (design 3B) : de quoi le remplir dès la première connexion.
 *
 * <ul>
 * <li>ada porte Paperweight, des pages web légères, avec Tunde : deux rôles ouverts et deux candidatures à
 * étudier. Elle fait aussi le front-end de lagos-transit, et sa candidature au tableau de bord d'AgriData
 * attend une réponse.</li>
 * <li>musa maintient le back-end de momo-sdk, où la candidature de Thandiwe au portage Kotlin l'attend (en
 * plus de son équipe de hackathon, Tontine Cloud).</li>
 * </ul>
 *
 * Tout passe par les services métier, puis les dates sont étalées sur les dernières semaines. Ne s'exécute
 * qu'une fois, après la vitrine, les comptes d'essai et les hackathons ; sans vitrine, rien n'est créé.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardSeeder {

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectOpeningRepository openingRepository;
    private final ProjectService projectService;
    private final ProjectOpeningService openingService;
    private final DevlogService devlogService;
    private final GithubActivityService githubService;
    private final JdbcTemplate jdbcTemplate;

    public void seed() {
        Long ada = accounts.id("ada");
        Long musa = accounts.id("musa");
        if (projectRepository.findBySlug("paperweight").isPresent()) {
            log.info("[Init] Atelier des comptes d'essai déjà initialisé, skip.");
            return;
        }
        Long lagos = projectId("lagos-transit");
        Long agri = projectId("agridata");
        Long momo = projectId("momo-sdk");
        if (lagos == null || agri == null || momo == null) {
            log.info("[Init] Pas de vitrine : atelier des comptes d'essai non créé.");
            return;
        }
        log.info("[Init] Atelier des comptes d'essai...");

        Long chinedu = accounts.id("chinedu_okafor");
        Long tunde = accounts.id("tunde_adeyemi");
        Long awa = accounts.id("awa_diop");
        Long aminata = accounts.id("aminata_traore");
        Long omar = accounts.id("omar_benali");

        // ═══════════════════════════════════════════════════════════════
        //  ADA : SON PROJET, SON ÉQUIPE, SA CANDIDATURE
        // ═══════════════════════════════════════════════════════════════

        DemoCover mast = DemoCover.of("paperweight", "Director Mtonga Kenya", "CC BY-SA 4.0",
                "10_Technological_Advantages_of_Masts_for_a_Nation.jpg");
        Long paperweight = projectService.create(ada, mast.applyTo(ProjectRequest.builder())
                .name("Paperweight")
                .tagline("Des pages web de moins de 100 ko : formulaires, listes et cartes qui s'affichent en 2G.")
                .description("""
                        Des composants React pour les sites qui doivent s'ouvrir **avec un forfait de 500 Mo** : chaque page pèse moins de 100 ko, images comprises.

                        - Formulaires qui gardent la saisie hors-ligne
                        - Listes virtuelles qui tiennent des milliers de lignes sur un téléphone d'entrée de gamme
                        - Un budget de poids vérifié à chaque pull request
                        """.strip())
                // Dépôt fictif : example.com est un domaine réservé à la documentation
                .repositoryUrl("https://example.com/ndadiee-demo/paperweight")
                .license("MIT")
                .lookingForContributors(true)
                .tags(List.of("React", "TypeScript", "CSS", "Performance"))
                .build()).getId();
        projectService.updateMySpecialty(ada, paperweight, MemberSpecialtyRequest.builder().specialty(TeamRole.FRONTEND).build());
        team(paperweight, ada, tunde, ProjectRole.CONTRIBUTOR, TeamRole.FRONTEND);

        Long design = opening(ada, paperweight, TeamRole.DESIGN, "Designer UI · thème sombre",
                "Un thème sombre lisible en plein soleil comme la nuit, sans une image de plus.", 1, 14, "Palette du thème sombre");
        Long docs = opening(ada, paperweight, TeamRole.DOCS, "Rédaction de la documentation",
                "Un guide de démarrage en français et en anglais, avec le poids de chaque composant.", 1, 9, "Page « Démarrer »");
        apply(aminata, paperweight, design,
                "J'ai dessiné le thème sombre d'une appli de tontine à Abidjan : contrastes vérifiés, et zéro image. Je peux commencer par la palette.");
        apply(omar, paperweight, docs,
                "Je documente des API Laravel depuis cinq ans, en français et en anglais. Le poids de chaque composant dans la doc, c'est une super idée.");

        devlog(paperweight, ada, "v0.1", 9, "Premier composant : un formulaire de 9 ko qui garde la saisie quand le réseau tombe.");
        devlog(paperweight, tunde, null, 1, "La liste virtuelle tient 5 000 lignes sur un téléphone de 1 Go, sans saccade.");
        githubService.record(paperweight, new GithubActivityService.Snapshot(23, 4, 7, 3, 2,
                List.of(0, 0, 0, 0, 0, 0, 0, 2, 5, 11, 8, 9), "v0.1", Instant.now().minus(Duration.ofDays(9)),
                Instant.now().minus(Duration.ofHours(2)), Instant.now().minus(Duration.ofMinutes(18))));

        // Le front-end de lagos-transit, et une candidature au tableau de bord des prix d'AgriData
        team(lagos, chinedu, ada, ProjectRole.CONTRIBUTOR, TeamRole.FRONTEND);
        Long agriFront = openingId(agri, TeamRole.FRONTEND);
        if (agriFront != null) {
            apply(ada, agri, agriFront,
                    "Je fais des interfaces qui restent légères avec un petit forfait : un tableau des prix lisible sur téléphone, c'est exactement ça.");
        }

        // ═══════════════════════════════════════════════════════════════
        //  MUSA : MAINTENEUR DU BACK-END DE MOMO-SDK
        // ═══════════════════════════════════════════════════════════════

        team(momo, awa, musa, ProjectRole.MAINTAINER, TeamRole.BACKEND);

        spreadDates(ada, musa, paperweight, lagos, agri, momo, tunde, aminata, omar);
        log.info("[Init] Atelier des comptes d'essai prêt : Paperweight (ada), momo-sdk (musa)");
    }

    // ==================== ÉQUIPES ET ANNONCES ====================

    private Long projectId(String slug) {
        return projectRepository.findBySlug(slug).map(Project::getId).orElse(null);
    }

    // Une annonce ouverte du projet pour ce rôle
    private Long openingId(Long projectId, TeamRole role) {
        return openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(List.of(projectId)).stream()
                .filter(opening -> opening.getRole() == role)
                .map(ProjectOpening::getId)
                .findFirst()
                .orElse(null);
    }

    // Demande de contribution acceptée par le porteur, avec le rôle tenu dans l'équipe
    private void team(Long projectId, Long ownerId, Long developerId, ProjectRole role, TeamRole specialty) {
        Long memberId = projectService.join(developerId, projectId).getId();
        projectService.decide(ownerId, projectId, memberId,
                MemberDecisionRequest.builder().status(MemberStatus.ACCEPTED).role(role).specialty(specialty).build());
    }

    private Long opening(Long ownerId, Long projectId, TeamRole role, String title, String description, int seats,
            Integer starterIssueNumber, String starterIssueTitle) {
        return openingService.create(ownerId, projectId, ProjectOpeningRequest.builder()
                .role(role)
                .title(title)
                .description(description)
                .seats(seats)
                .starterIssueNumber(starterIssueNumber)
                .starterIssueTitle(starterIssueTitle)
                .build()).getId();
    }

    private void apply(Long developerId, Long projectId, Long openingId, String motivation) {
        projectService.join(developerId, projectId, JoinProjectRequest.builder()
                .openingId(openingId)
                .motivation(motivation)
                .build());
    }

    private void devlog(Long projectId, Long authorId, String version, int daysAgo, String body) {
        Long id = devlogService.create(authorId, projectId, DevlogEntryRequest.builder().version(version).body(body).build()).getId();
        jdbcTemplate.update("UPDATE devlog_entries SET created_at = now() - make_interval(hours => ?), updated_at = now() - make_interval(hours => ?) WHERE id = ?",
                daysAgo * 24 - 3, daysAgo * 24 - 3, id);
    }

    // ==================== DATES ====================

    /**
     * Paperweight est né il y a trois semaines, Tunde l'a rejoint dix jours plus tard ; ses annonces datent de
     * la semaine dernière, les candidatures des dernières heures. Ada est dans l'équipe de lagos-transit depuis
     * douze jours, musa dans celle de momo-sdk depuis vingt.
     */
    private void spreadDates(Long ada, Long musa, Long paperweight, Long lagos, Long agri, Long momo, Long tunde,
            Long aminata, Long omar) {
        jdbcTemplate.update("UPDATE projects SET created_at = now() - interval '21 days' WHERE id = ?", paperweight);
        member(paperweight, ada, "21 days");
        member(paperweight, tunde, "11 days");
        member(paperweight, aminata, "7 hours");
        member(paperweight, omar, "1 day 6 hours");
        jdbcTemplate.update("""
                UPDATE project_openings SET created_at = now() - interval '6 days' + make_interval(hours => (id % 5)::int)
                WHERE project_id = ?
                """, paperweight);
        member(lagos, ada, "12 days");
        member(agri, ada, "5 hours");
        member(momo, musa, "20 days");
        jdbcTemplate.update("UPDATE projects SET updated_at = created_at WHERE id = ?", paperweight);
        jdbcTemplate.update("UPDATE project_openings SET updated_at = created_at WHERE project_id = ?", paperweight);
        jdbcTemplate.update("UPDATE project_members SET updated_at = created_at WHERE project_id IN (?, ?, ?, ?)",
                paperweight, lagos, agri, momo);
    }

    private void member(Long projectId, Long userId, String age) {
        memberRepository.findByProjectIdAndUserId(projectId, userId).ifPresent(member -> jdbcTemplate.update(
                "UPDATE project_members SET created_at = now() - ?::interval WHERE id = ?", age, member.getId()));
    }
}
