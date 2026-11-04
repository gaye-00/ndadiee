package com.hautetech.ndadiee.initializer;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.SprintRequest;
import com.hautetech.ndadiee.dto.request.TaskRequest;
import com.hautetech.ndadiee.dto.request.TeamEventRequest;
import com.hautetech.ndadiee.dto.request.TeamMessageRequest;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.workspace.TaskStatus;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.TaskRepository;
import com.hautetech.ndadiee.service.workspace.SprintService;
import com.hautetech.ndadiee.service.workspace.TaskService;
import com.hautetech.ndadiee.service.workspace.TeamChatService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les espaces d'équipe de démonstration (design 3E, 3G).
 *
 * <ul>
 * <li>lagos-transit suit le design 3E : le sprint 7 (« Notifications de départ », six jours restants), ses tâches dans les
 * quatre colonnes, les issues « premier pas » de ses annonces (#33, #40, #45), la #77 d'Ama en revue avec sa PR #84, et
 * une discussion où Tunde propose un pair programming à 15 h. Ada y fait le front-end.</li>
 * <li>Paperweight, le projet d'Ada avec Tunde : un petit tableau, sans sprint encore.</li>
 * <li>momo-sdk, où musa maintient le back-end : le sprint 3, « SDK Android ».</li>
 * <li>Le dossier patient d'OpenMRS, d'Ada, reste vide : on y voit l'accueil d'un tableau neuf.</li>
 * </ul>
 *
 * Tout passe par les services de l'espace, puis numéros et dates sont ajustés. Ne s'exécute que si aucune tâche
 * n'existe, après les revues de code (les tâches livrent leurs PR).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceSeeder {

    // L'heure des rendez-vous de la démonstration : celle de Lagos
    private static final ZoneId LAGOS = ZoneId.of("Africa/Lagos");

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final SprintService sprintService;
    private final TeamChatService chatService;
    private final JdbcTemplate jdbcTemplate;

    public void seed() {
        if (taskRepository.count() > 0) {
            log.info("[Init] Espaces d'équipe déjà initialisés, skip.");
            return;
        }
        if (projectRepository.findBySlug("lagos-transit").isEmpty() || projectRepository.findBySlug("paperweight").isEmpty()) {
            log.info("[Init] Pas de vitrine ni d'atelier : espaces d'équipe non créés.");
            return;
        }
        log.info("[Init] Espaces d'équipe...");
        lagosTransit();
        paperweight();
        momoSdk();
        log.info("[Init] Espaces d'équipe prêts : {} tâches", taskRepository.count());
    }

    // ═══════════════════════════════════════════════════════════════
    //  LAGOS-TRANSIT : LE SPRINT 7 DU DESIGN 3E
    // ═══════════════════════════════════════════════════════════════

    private void lagosTransit() {
        String lagos = "lagos-transit";
        String chinedu = "chinedu_okafor";
        String kwame = "kwame_asante";
        String tunde = "tunde_adeyemi";
        String ama = "ama_owusu";
        String ada = "ada";
        Board board = new Board(lagos);

        // Les six premiers sprints, deux semaines chacun ; le sixième a livré le mode hors-ligne et la CI du flux GTFS
        String[] goals = { "Premiers horaires du BRT", "API GraphQL publique", "Appli mobile : écran arrêt",
                "Collecte des horaires danfo", "Performance de la page arrêt", "Mode hors-ligne" };
        for (int index = 0; index < goals.length; index++) {
            sprintService.start(lagos, accounts.id(chinedu), SprintRequest.builder().goal(goals[index]).weeks(2).build());
            if (index == goals.length - 1) {
                board.task(tunde, tunde, 29, "Mode hors-ligne : les 20 derniers arrêts consultés", TeamRole.MOBILE, TaskStatus.DONE, 79, 10 * 24, null);
                board.task(kwame, kwame, 36, "Validation du flux GTFS en intégration continue", TeamRole.DATA, TaskStatus.DONE, 81, 7 * 24, null);
                board.task(chinedu, chinedu, 31, "Mesurer le temps de réponse de la page arrêt", TeamRole.BACKEND, TaskStatus.DONE, null, 12 * 24, null);
            }
            sprintService.close(lagos, accounts.id(chinedu));
        }
        sprintService.start(lagos, accounts.id(chinedu), SprintRequest.builder().goal("Notifications de départ").weeks(2).build());

        // À faire : les issues « premier pas » des annonces attendent leur nouvelle recrue
        board.task(chinedu, null, 33, "Afficher le prochain BRT sur l'écran arrêt", TeamRole.MOBILE, TaskStatus.TODO, null, 7 * 24, """
                L'issue « premier pas » du rôle mobile : sur l'écran d'un arrêt, le prochain BRT en grand, avec son quai.

                - Les données viennent déjà de `departures(stopId)`
                - Un composant de moins de 5 ko
                """);
        board.task(chinedu, null, 40, "Maquette de la page arrêt", TeamRole.DESIGN, TaskStatus.TODO, null, 7 * 24, null);
        board.task(chinedu, chinedu, 46, "Limiter les requêtes GraphQL par IP", TeamRole.BACKEND, TaskStatus.TODO, null, 6 * 24, null);
        board.task(chinedu, tunde, 49, "Notification 5 minutes avant le départ", TeamRole.MOBILE, TaskStatus.TODO, null, 8 * 24, """
                L'objectif du sprint : prévenir 5 minutes avant le passage du bus choisi.

                - Une notification locale, qui marche aussi hors-ligne
                - Se désactive depuis l'écran du trajet
                """);
        board.task(ada, ada, 51, "Choisir ses arrêts favoris pour les notifications", TeamRole.FRONTEND, TaskStatus.TODO, null, 3 * 24, null);

        // En cours
        board.task(tunde, tunde, 38, "Mode hors-ligne : file de synchronisation", TeamRole.MOBILE, TaskStatus.IN_PROGRESS, null, 2 * 24, """
                Les arrêts consultés hors-ligne se synchronisent au retour du réseau, dans l'ordre, sans doublon.
                """);
        board.task(kwame, kwame, 45, "Valider le flux GTFS des danfo", TeamRole.DATA, TaskStatus.IN_PROGRESS, null, 26, null);
        board.task(chinedu, chinedu, 47, "Service d'envoi des notifications push", TeamRole.BACKEND, TaskStatus.IN_PROGRESS, null, 3 * 24, null);

        // En revue, avec leurs pull requests
        board.task(ama, ama, 77, "Cache Redis pour les horaires BRT", TeamRole.BACKEND, TaskStatus.IN_REVIEW, 84, 50, """
                Mon issue « premier pas » : mettre en cache les prochains passages de chaque arrêt dans Redis.
                Objectif : la page arrêt sous les 200 ms.
                """);
        board.task(chinedu, chinedu, 43, "Pagination des prochains passages", TeamRole.BACKEND, TaskStatus.IN_REVIEW, 86, 30, null);
        board.task(tunde, tunde, 42, "Carte des arrêts : regroupement et thème sombre", TeamRole.FRONTEND, TaskStatus.IN_REVIEW, 88, 20, null);
        board.task(ada, ada, 44, "Écran trajets lisible au lecteur d'écran", TeamRole.FRONTEND, TaskStatus.IN_REVIEW, 90, 6, null);

        // Terminées pendant ce sprint
        board.task(kwame, kwame, 41, "Relevé des arrêts danfo d'Ikorodu", TeamRole.DATA, TaskStatus.DONE, null, 4 * 24, null);
        board.task(chinedu, ama, 39, "Expiration configurable du cache", TeamRole.BACKEND, TaskStatus.DONE, null, 28, null);
        board.finish();

        // Les dates des sprints : deux semaines chacun, le septième a commencé il y a huit jours
        jdbcTemplate.update("""
                UPDATE sprints SET starts_at = now() - make_interval(days => 8 + (7 - number) * 14),
                    ends_at = now() - make_interval(days => 8 + (7 - number) * 14) + interval '14 days',
                    closed_at = CASE WHEN closed_at IS NULL THEN NULL
                        ELSE now() - make_interval(days => 8 + (7 - number) * 14) + interval '14 days' END
                WHERE project_id = (SELECT id FROM projects WHERE slug = ?)
                """, lagos);
        jdbcTemplate.update("UPDATE sprints SET created_at = starts_at, updated_at = COALESCE(closed_at, starts_at) "
                + "WHERE project_id = (SELECT id FROM projects WHERE slug = ?)", lagos);

        // La discussion : le sprint, les revues, le pair programming de Tunde
        Chat chat = new Chat(lagos);
        chat.say(chinedu, 8 * 24 - 2, "Sprint 7 lancé : objectif **notifications de départ**. Je prends le service d'envoi (#47).");
        chat.say(kwame, 8 * 24 - 3, "Le relevé des danfo d'Ikorodu est fini : 212 arrêts. Je valide le flux cette semaine (#45).");
        chat.say(tunde, 2 * 24 + 4, "#38 avance : la file de synchronisation tient trois jours hors-ligne. Je teste sur un Tecno ce soir.");
        chat.say(ama, 30, "@chinedu_okafor l'expiration du cache est configurable maintenant (#39). Tu peux relire la PR de #77 ?");
        chat.say(chinedu, 29, "Je regarde après le stand-up. Pense au jitter que proposait Wanjiru, sinon toutes les clés expirent ensemble.");
        chat.say(ada, 5, "J'ai repris l'écran trajets pour le lecteur d'écran (#44) : la liste ne s'annonce plus à chaque rafraîchissement.");
        chat.say(tunde, 4, "@ama_owusu on fait le cache ensemble cet après-midi ? Je partage mon écran.");
        chat.say(ama, 4, "Avec plaisir ! J'apporte le flux GTFS de ce matin pour les tests.");
        chat.event(tunde, 3, "Pair programming : cache Redis", nextAfternoon(15), 60, "https://meet.jit.si/lagos-transit-cache", ama, chinedu);
        chat.say(kwame, 1, "Le validateur GTFS tourne en CI : plus de flux cassé en production.");
    }

    // ═══════════════════════════════════════════════════════════════
    //  PAPERWEIGHT : LE PROJET D'ADA, SANS SPRINT ENCORE
    // ═══════════════════════════════════════════════════════════════

    private void paperweight() {
        String ada = "ada";
        String tunde = "tunde_adeyemi";
        Board board = new Board("paperweight");
        board.task(ada, null, 14, "Palette du thème sombre", TeamRole.DESIGN, TaskStatus.TODO, null, 6 * 24, """
                L'issue « premier pas » du rôle design : un thème sombre lisible en plein soleil comme la nuit, sans une image de plus.
                """);
        board.task(ada, null, 9, "Page « Démarrer »", TeamRole.DOCS, TaskStatus.TODO, null, 6 * 24, null);
        board.task(ada, ada, 15, "Carte : 30 ko au plus, tuiles comprises", TeamRole.FRONTEND, TaskStatus.TODO, null, 2 * 24, null);
        board.task(tunde, tunde, 11, "Formulaire hors-ligne : file de sauvegarde", TeamRole.FRONTEND, TaskStatus.IN_PROGRESS, 14, 4, null);
        board.task(tunde, tunde, 6, "Liste virtuelle : 5 000 lignes sans saccade", TeamRole.FRONTEND, TaskStatus.IN_REVIEW, 12, 26, null);
        board.task(ada, ada, 3, "Budget de poids vérifié à chaque pull request", TeamRole.FRONTEND, TaskStatus.DONE, 9, 8 * 24, null);
        board.finish();

        Chat chat = new Chat("paperweight");
        chat.say(tunde, 26, "@ada la liste virtuelle est prête à relire (#6) : 58 images par seconde sur un Tecno Spark 8.");
        chat.say(ada, 25, "Génial ! Je la relis ce soir. Le composant reste sous le budget ?");
        chat.say(tunde, 24, "2,1 ko compressé. Le budget passe au vert.");
    }

    // ═══════════════════════════════════════════════════════════════
    //  MOMO-SDK : LE SPRINT 3 DE MUSA
    // ═══════════════════════════════════════════════════════════════

    private void momoSdk() {
        if (projectRepository.findBySlug("momo-sdk").isEmpty()) {
            return;
        }
        String awa = "awa_diop";
        String kofi = "kofi_mensah";
        String omar = "omar_benali";
        String musa = "musa";
        Board board = new Board("momo-sdk");
        sprintService.start("momo-sdk", accounts.id(awa), SprintRequest.builder().goal("Paiements Wave").weeks(2).build());
        board.task(omar, omar, 52, "Webhooks : vérification de signature en une ligne", TeamRole.SECURITY, TaskStatus.DONE, 55, 16 * 24, null);
        sprintService.close("momo-sdk", accounts.id(awa));
        sprintService.start("momo-sdk", accounts.id(awa), SprintRequest.builder().goal("Statut des paiements").weeks(2).build());
        sprintService.close("momo-sdk", accounts.id(awa));
        sprintService.start("momo-sdk", accounts.id(awa), SprintRequest.builder().goal("SDK Android").weeks(3).build());

        board.task(awa, null, 51, "Client Kotlin : initier un paiement", TeamRole.PAYMENTS, TaskStatus.TODO, null, 9 * 24, null);
        board.task(musa, musa, 60, "Relancer les appels aux opérateurs avec un délai croissant", TeamRole.BACKEND, TaskStatus.TODO, null, 2 * 24, null);
        board.task(musa, musa, 58, "Environnement de test Wave sans compte marchand", TeamRole.BACKEND, TaskStatus.IN_PROGRESS, null, 3 * 24, null);
        board.task(kofi, kofi, 56, "Guide d'intégration en anglais", TeamRole.DOCS, TaskStatus.IN_REVIEW, 59, 3 * 24, null);
        board.task(awa, awa, 54, "Stocker les clés des opérateurs chiffrées", TeamRole.SECURITY, TaskStatus.DONE, null, 5 * 24, null);
        board.finish();

        jdbcTemplate.update("""
                UPDATE sprints SET starts_at = now() - make_interval(days => 5 + (3 - number) * 14),
                    ends_at = now() - make_interval(days => 5 + (3 - number) * 14) + CASE WHEN number = 3 THEN interval '21 days' ELSE interval '14 days' END,
                    closed_at = CASE WHEN closed_at IS NULL THEN NULL ELSE now() - make_interval(days => 5 + (3 - number) * 14) + interval '14 days' END
                WHERE project_id = (SELECT id FROM projects WHERE slug = 'momo-sdk')
                """);
        jdbcTemplate.update("UPDATE sprints SET created_at = starts_at, updated_at = COALESCE(closed_at, starts_at) "
                + "WHERE project_id = (SELECT id FROM projects WHERE slug = 'momo-sdk')");

        Chat chat = new Chat("momo-sdk");
        chat.say(awa, 5 * 24, "Sprint 3 : le **SDK Android**. Thandiwe a postulé pour le client Kotlin (#51), je regarde sa candidature.");
        chat.say(kofi, 3 * 24, "Le guide en anglais est en revue (#56). @musa tu peux jeter un œil à la partie webhooks ?");
        chat.say(musa, 3 * 24 - 4, "C'est fait, deux remarques sur les exemples de signature. Sinon c'est très clair.");
    }

    // ==================== GESTES ====================

    // 15 h à Lagos aujourd'hui ; demain si l'heure est déjà passée
    private static Instant nextAfternoon(int hour) {
        ZonedDateTime now = ZonedDateTime.now(LAGOS);
        ZonedDateTime today = now.with(LocalTime.of(hour, 0)).truncatedTo(ChronoUnit.MINUTES);
        return (today.isAfter(now) ? today : today.plusDays(1)).toInstant();
    }

    /** Le tableau d'un projet : des tâches créées par l'équipe, puis leurs numéros et leurs dates ajustés. */
    private final class Board {

        private final String slug;
        private final List<Placed> placed = new ArrayList<>();

        private Board(String slug) {
            this.slug = slug;
        }

        private record Placed(Long id, int number, TaskStatus status, int hoursInColumn) {
        }

        // Une tâche créée par son auteur, dans sa colonne depuis quelques heures
        void task(String author, String assignee, int number, String title, TeamRole role, TaskStatus status,
                Integer pullRequest, int hoursInColumn, String description) {
            Long id = taskService.create(slug, accounts.id(author), TaskRequest.builder()
                    .title(title)
                    .description(description == null ? null : description.strip())
                    .role(role)
                    .assigneeId(assignee == null ? null : accounts.id(assignee))
                    .pullRequestNumber(pullRequest)
                    .status(status)
                    .build()).getId();
            placed.add(new Placed(id, number, status, hoursInColumn));
        }

        // Les numéros du design (« #38 »), et les dates : une tâche qui a avancé a été créée un peu avant d'arriver dans
        // sa colonne ; une tâche à faire y est depuis sa création
        void finish() {
            jdbcTemplate.update("UPDATE tasks SET number = number + 100000 WHERE project_id = (SELECT id FROM projects WHERE slug = ?)", slug);
            for (Placed task : placed) {
                int age = task.hoursInColumn() + (task.status() == TaskStatus.TODO ? 0 : 30);
                jdbcTemplate.update("""
                        UPDATE tasks SET number = ?, status_changed_at = now() - make_interval(hours => ?),
                            created_at = now() - make_interval(hours => ?), updated_at = now() - make_interval(hours => ?)
                        WHERE id = ?
                        """, task.number(), task.hoursInColumn(), age, task.hoursInColumn(), task.id());
            }
            placed.clear();
        }
    }

    /** La discussion d'un projet : les messages dans l'ordre, chacun daté de quelques heures. */
    private final class Chat {

        private final String slug;

        private Chat(String slug) {
            this.slug = slug;
        }

        void say(String author, int hoursAgo, String body) {
            Long id = chatService.post(slug, accounts.id(author), TeamMessageRequest.builder().body(body).build()).getId();
            backdate(id, hoursAgo);
        }

        // Un rendez-vous proposé par son auteur ; d'autres membres disent qu'ils y seront
        void event(String author, int hoursAgo, String title, Instant startsAt, int minutes, String link, String... attendees) {
            Long id = chatService.schedule(slug, accounts.id(author), TeamEventRequest.builder()
                    .title(title)
                    .startsAt(startsAt)
                    .durationMinutes(minutes)
                    .link(link)
                    .build()).getId();
            for (String attendee : attendees) {
                chatService.attend(slug, accounts.id(attendee), id, true);
            }
            backdate(id, hoursAgo);
            jdbcTemplate.update("UPDATE team_event_attendees SET created_at = now() - make_interval(hours => ?), "
                    + "updated_at = now() - make_interval(hours => ?) WHERE message_id = ?", hoursAgo, hoursAgo, id);
        }

        private void backdate(Long id, int hoursAgo) {
            jdbcTemplate.update("UPDATE team_messages SET created_at = now() - make_interval(hours => ?), "
                    + "updated_at = now() - make_interval(hours => ?) WHERE id = ?", hoursAgo, hoursAgo, id);
        }
    }
}
