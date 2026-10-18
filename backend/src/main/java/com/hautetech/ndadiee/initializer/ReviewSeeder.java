package com.hautetech.ndadiee.initializer;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.service.review.ReviewService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les revues de code de démonstration (design 3B, 3C) : une vingtaine de pull requests dans les projets de la
 * vitrine, avec leurs relecteurs, leurs verdicts et quelques commentaires.
 *
 * <ul>
 * <li>lagos-transit suit le design 3C : la #84 d'Ama (cache Redis, sa première contribution), où Chinedu demande
 * des changements avec une suggestion ligne 24, Tunde approuve et Wanjiru commente en relectrice communautaire.</li>
 * <li>ada a deux revues à rendre (la liste virtuelle de Paperweight, la carte des arrêts de lagos-transit), sa
 * propre PR d'accessibilité où Tunde demande des changements, et des PR communautaires de sa stack (React).</li>
 * <li>musa doit relire le client Kotlin de momo-sdk ; sa PR de Tontine Cloud attend Kofi.</li>
 * </ul>
 *
 * Tout passe par ReviewService, puis les dates sont étalées sur les derniers jours. Ne s'exécute que si aucune PR
 * n'existe, après la vitrine, les hackathons et l'atelier des comptes d'essai.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewSeeder {

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final PullRequestRepository pullRequestRepository;
    private final ReviewService reviewService;
    private final JdbcTemplate jdbcTemplate;

    public void seed() {
        if (pullRequestRepository.count() > 0) {
            log.info("[Init] Revues de code déjà initialisées, skip.");
            return;
        }
        if (projectRepository.findBySlug("lagos-transit").isEmpty()) {
            log.info("[Init] Pas de vitrine : revues de code non créées.");
            return;
        }
        log.info("[Init] Création des revues de code...");

        // ═══════════════════════════════════════════════════════════════
        //  LAGOS-TRANSIT : LE DESIGN 3C, ET LE FRONT D'ADA
        // ═══════════════════════════════════════════════════════════════

        Long redis = pr("lagos-transit", "ama_owusu", 84, "Cache Redis pour les horaires BRT", """
                Met en cache les prochains passages de chaque arrêt dans Redis : la page arrêt passe de 1,8 s à 120 ms.

                - `Cache.Departures` lit Redis, puis la source si la clé manque
                - Redis rejoint `docker-compose.yml`
                - Tests sur le flux GTFS du jour

                Résout #77, mon issue « premier pas ».
                """, "feat/redis-cache", 6, 4, 214, 38, 3, 3, 0, 77, true, false, 50, "go", "redis");
        review(redis, "chinedu_okafor", true, ReviewState.CHANGES_REQUESTED, 50, 30);
        review(redis, "tunde_adeyemi", false, ReviewState.APPROVED, 50, 26);
        review(redis, "wanjiru_kamau", false, ReviewState.COMMENTED, 22, 20);
        comment(redis, "chinedu_okafor", 30,
                "Expiration à 0 : les horaires ne seront jamais rafraîchis. Le BRT change ses horaires à 5 h, je propose 10 minutes et une erreur gérée :",
                "internal/schedule/cache.go", 24, "if err == nil { c.rdb.Set(ctx, key, encode(deps), 10*time.Minute) }");
        comment(redis, "ama_owusu", 28, "Bien vu, merci ! Je rends la durée configurable dans `config.yaml`.", "internal/schedule/cache.go", 24, null);
        comment(redis, "wanjiru_kamau", 20,
                "À Nairobi on a eu le même souci : ajoute un jitter pour éviter que toutes les clés expirent en même temps.",
                "internal/schedule/cache.go", 24, null);
        comment(redis, "kwame_asante", 18, "Les tests passent avec le flux GTFS de ce matin.", null, null, null);

        Long map = pr("lagos-transit", "tunde_adeyemi", 88, "Carte des arrêts : regroupement et thème sombre", """
                La carte web regroupe les arrêts proches sous le zoom 13 et suit le thème sombre du système.
                Captures avant / après dans la description du ticket.
                """, "feat/stops-map", 5, 9, 312, 45, 3, 2, 0, null, false, false, 20, "react", "maplibre");
        review(map, "ada", true, ReviewState.REQUESTED, 20, null);
        review(map, "chinedu_okafor", false, ReviewState.REQUESTED, 20, null);
        comment(map, "tunde_adeyemi", 19, "Le regroupement se déclenche sous le zoom 13 ; au-dessus, chaque arrêt a son point.", null, null, null);

        Long cursor = pr("lagos-transit", "chinedu_okafor", 86, "Pagination des prochains passages dans l'API GraphQL", """
                Les prochains passages se lisent page par page, avec un curseur : plus de réponse de 400 ko aux gros arrêts.
                """, "feat/departures-cursor", 3, 5, 128, 40, 3, 3, 0, null, false, false, 30, "go", "graphql");
        review(cursor, "kwame_asante", true, ReviewState.APPROVED, 30, 10);
        review(cursor, "ama_owusu", false, ReviewState.REQUESTED, 30, null);

        Long a11y = pr("lagos-transit", "ada", 90, "Écran trajets lisible au lecteur d'écran", """
                Chaque trajet s'annonce en une phrase (« BRT Ikorodu–CMS, dans 4 minutes, quai 2 ») et la liste garde le focus
                quand elle se rafraîchit.
                """, "feat/a11y-trips", 4, 6, 156, 62, 3, 3, 0, null, false, false, 6, "react", "accessibility");
        review(a11y, "tunde_adeyemi", true, ReviewState.CHANGES_REQUESTED, 6, 3);
        review(a11y, "chinedu_okafor", false, ReviewState.REQUESTED, 6, null);
        comment(a11y, "tunde_adeyemi", 3,
                "Les annonces se répètent à chaque rafraîchissement de la liste : coupe la région live pendant la mise à jour.",
                "web/src/trips/TripList.tsx", 42, "<ol aria-live={refreshing ? 'off' : 'polite'}>");

        Long gtfs = pr("lagos-transit", "kwame_asante", 81, "Validation du flux GTFS en intégration continue", null,
                "ci/gtfs-validate", 2, 3, 64, 5, 2, 2, 0, null, false, false, 8 * 24, "gtfs", "ci");
        review(gtfs, "chinedu_okafor", true, ReviewState.APPROVED, 8 * 24, 7 * 24);
        merge(gtfs, 6 * 24);

        Long offline = pr("lagos-transit", "tunde_adeyemi", 79, "Mode hors-ligne : les 20 derniers arrêts consultés", null,
                "feat/offline-stops", 7, 11, 388, 52, 3, 3, 0, null, false, false, 11 * 24, "react native", "offline");
        review(offline, "ada", false, ReviewState.APPROVED, 11 * 24, 10 * 24);
        review(offline, "chinedu_okafor", true, ReviewState.APPROVED, 11 * 24, 10 * 24 - 3);
        merge(offline, 9 * 24 + 2);

        Long leaflet = pr("lagos-transit", "ada", 73, "Prototype de carte avec Leaflet", null,
                "spike/leaflet-map", 3, 4, 120, 8, 2, 1, 1, null, false, false, 12 * 24, "react", "leaflet");
        review(leaflet, "tunde_adeyemi", false, ReviewState.COMMENTED, 12 * 24, 11 * 24);
        comment(leaflet, "tunde_adeyemi", 11 * 24, "Les tuiles pèsent trop en 3G : MapLibre avec des tuiles vectorielles ?", null, null, null);
        close(leaflet, 11 * 24 - 5);

        // ═══════════════════════════════════════════════════════════════
        //  PAPERWEIGHT : LE PROJET D'ADA
        // ═══════════════════════════════════════════════════════════════

        Long virtual = pr("paperweight", "tunde_adeyemi", 12, "Liste virtuelle : 5 000 lignes sans saccade", """
                Une liste qui ne rend que les lignes visibles. Mesuré sur un Tecno Spark 8 : 58 images par seconde en défilement continu.
                """, "feat/virtual-list", 7, 8, 486, 58, 3, 3, 0, 6, false, false, 26, "react", "performance");
        review(virtual, "ada", true, ReviewState.REQUESTED, 26, null);
        comment(virtual, "tunde_adeyemi", 25, "Le composant pèse 2,1 ko compressé : on reste sous le budget.", null, null, null);

        Long budget = pr("paperweight", "ada", 9, "Budget de poids vérifié à chaque pull request", null,
                "ci/size-budget", 3, 4, 96, 2, 2, 2, 0, null, false, false, 10 * 24, "ci", "performance");
        review(budget, "tunde_adeyemi", true, ReviewState.APPROVED, 10 * 24, 9 * 24);
        merge(budget, 8 * 24);

        pr("paperweight", "tunde_adeyemi", 14, "Formulaire hors-ligne : file de sauvegarde", null,
                "feat/offline-form", 2, 3, 90, 4, 1, 0, 0, null, false, true, 4, "react", "offline");

        // ═══════════════════════════════════════════════════════════════
        //  REVUES COMMUNAUTAIRES : OUVERTES AUX RELECTEURS HORS ÉQUIPE
        // ═══════════════════════════════════════════════════════════════

        Long datepicker = pr("sahel-ui", "aminata_traore", 203, "DatePicker : navigation complète au clavier", """
                Flèches, Page précédente / suivante et Début / Fin, comme le recommande l'ARIA Authoring Practices.
                """, "feat/datepicker-keyboard", 4, 6, 241, 37, 4, 4, 0, 188, true, false, 40, "react", "accessibility", "typescript");
        review(datepicker, "kofi_mensah", true, ReviewState.REQUESTED, 40, null);

        Long chart = pr("agridata", "selam_tesfaye", 18, "Tableau des prix : un graphique SVG de 3 ko", """
                Remplace la bibliothèque de graphiques (180 ko) par un SVG dessiné à la main : la page s'ouvre en 2G.
                """, "feat/svg-chart", 3, 5, 178, 12, 3, 3, 0, null, true, false, 14, "react", "svg");
        review(chart, "jeanpaul_nkurunziza", true, ReviewState.REQUESTED, 14, null);
        comment(chart, "samuel_ngono", 9, "Testé sur un Itel A56 : la courbe s'affiche en moins d'une seconde.", null, null, null);

        Long kotlin = pr("momo-sdk", "thandiwe_ndlovu", 57, "Client Kotlin : initier un paiement", """
                Première version du client Android : initier un paiement et suivre son statut. Les webhooks viendront dans une
                seconde PR.
                """, "feat/kotlin-client", 9, 14, 620, 0, 3, 2, 1, 51, true, false, 22, "kotlin", "android");
        review(kotlin, "musa", true, ReviewState.REQUESTED, 22, null);
        review(kotlin, "awa_diop", false, ReviewState.REQUESTED, 22, null);
        comment(kotlin, "thandiwe_ndlovu", 21, "Le test d'intégration échoue sur l'émulateur API 24 : je regarde ce soir.", null, null, null);

        Long guide = pr("momo-sdk", "kofi_mensah", 59, "Guide d'intégration en anglais", null,
                "docs/guide-en", 5, 7, 340, 20, 1, 1, 0, null, true, false, 3 * 24, "docs", "markdown");
        review(guide, "awa_diop", true, ReviewState.APPROVED, 3 * 24, 2 * 24);
        review(guide, "musa", false, ReviewState.COMMENTED, 3 * 24, 2 * 24 - 4);

        Long webhook = pr("momo-sdk", "omar_benali", 55, "Webhooks : vérification de signature en une ligne", null,
                "feat/webhook-verify", 4, 6, 210, 34, 3, 3, 0, null, false, false, 18 * 24, "java", "security");
        review(webhook, "awa_diop", true, ReviewState.APPROVED, 18 * 24, 17 * 24);
        review(webhook, "musa", false, ReviewState.APPROVED, 18 * 24, 17 * 24 - 6);
        merge(webhook, 16 * 24);

        Long sms = pr("wolof-nlp", "fatou_sow", 31, "Normaliseur : l'écriture SMS", null,
                "feat/sms-normalizer", 4, 5, 205, 31, 2, 2, 0, null, true, false, 2 * 24, "python", "nlp");
        review(sms, "mame_diarra_ndiaye", true, ReviewState.APPROVED, 2 * 24, 30);
        review(sms, "chioma_okafor", false, ReviewState.REQUESTED, 2 * 24, null);

        Long rtl = pr("eduoffline", "omar_benali", 145, "Leçons de droite à gauche en arabe", null,
                "feat/rtl-lessons", 6, 12, 188, 74, 3, 3, 0, 140, true, false, 30, "flutter", "rtl", "i18n");
        review(rtl, "thandiwe_ndlovu", true, ReviewState.REQUESTED, 30, null);
        review(rtl, "wanjiru_kamau", false, ReviewState.REQUESTED, 30, null);

        Long wave = pr("kawral", "aminata_traore", 27, "Payer sa place avec Wave à la réservation", null,
                "feat/wave-payment", 8, 10, 402, 36, 3, 2, 1, null, true, false, 4 * 24, "flutter", "payments");
        review(wave, "ibrahima_fall", true, ReviewState.CHANGES_REQUESTED, 4 * 24, 3 * 24);
        comment(wave, "ibrahima_fall", 3 * 24, "Si le départ est annulé, le remboursement doit partir tout seul : il manque ce cas.", null, null, null);

        Long helm = pr("naija-k8s-starter", "yassine_elamrani", 12, "Helm chart : limites mémoire par défaut", null,
                "feat/default-limits", 2, 3, 41, 9, 2, 2, 0, null, true, false, 10, "kubernetes", "helm");
        review(helm, "emeka_nwosu", true, ReviewState.REQUESTED, 10, null);

        // ═══════════════════════════════════════════════════════════════
        //  TONTINE CLOUD : LA PR DE MUSA
        // ═══════════════════════════════════════════════════════════════

        Long reminder = pr("tontine-cloud", "musa", 6, "Rappel SMS la veille du tour", null,
                "feat/sms-reminder", 5, 7, 264, 18, 3, 3, 0, null, false, false, 2 * 24, "java", "spring boot");
        review(reminder, "aminata_traore", true, ReviewState.APPROVED, 2 * 24, 26);
        review(reminder, "kofi_mensah", false, ReviewState.REQUESTED, 2 * 24, null);

        // La dernière activité de chaque PR : sa création, une revue, un commentaire, sa fusion ou sa fermeture
        jdbcTemplate.update("""
                UPDATE pull_requests pr SET last_activity_at = GREATEST(pr.created_at,
                    COALESCE((SELECT MAX(r.submitted_at) FROM pull_request_reviewers r WHERE r.pull_request_id = pr.id), pr.created_at),
                    COALESCE((SELECT MAX(c.created_at) FROM review_comments c WHERE c.pull_request_id = pr.id), pr.created_at),
                    COALESCE(pr.merged_at, pr.created_at), COALESCE(pr.closed_at, pr.created_at))
                """);
        jdbcTemplate.update("UPDATE pull_requests SET updated_at = last_activity_at");
        log.info("[Init] Revues de code créées : {} pull requests", pullRequestRepository.count());
    }

    // ==================== GESTES ====================

    // Une PR ouverte il y a quelques heures ; null si son projet n'existe pas
    private Long pr(String slug, String author, int number, String title, String body, String branch, int commits, int files,
            int additions, int deletions, int checks, int passed, int failed, Integer issue, boolean community, boolean draft,
            int hoursAgo, String... labels) {
        Long projectId = projectRepository.findBySlug(slug).map(Project::getId).orElse(null);
        if (projectId == null) {
            return null;
        }
        Long id = reviewService.open(ReviewService.Opening.builder()
                .projectId(projectId)
                .authorId(accounts.id(author))
                .number(number)
                .title(title)
                .body(body == null ? null : body.strip())
                .sourceBranch(branch)
                .targetBranch("main")
                .commits(commits)
                .filesChanged(files)
                .additions(additions)
                .deletions(deletions)
                .checksTotal(checks)
                .checksPassed(passed)
                .checksFailed(failed)
                .starterIssueNumber(issue)
                .labels(List.of(labels))
                .community(community)
                .draft(draft)
                .build()).getId();
        jdbcTemplate.update("UPDATE pull_requests SET created_at = now() - make_interval(hours => ?) WHERE id = ?", hoursAgo, id);
        return id;
    }

    // Une revue demandée il y a quelques heures, rendue (ou non) depuis
    private void review(Long pullRequestId, String reviewer, boolean required, ReviewState state, int requestedHoursAgo,
            Integer submittedHoursAgo) {
        if (pullRequestId == null) {
            return;
        }
        Long reviewerId = accounts.id(reviewer);
        Long id = reviewService.requestReview(pullRequestId, reviewerId, required).getId();
        if (state != ReviewState.REQUESTED) {
            reviewService.submitReview(pullRequestId, reviewerId, state);
        }
        jdbcTemplate.update("""
                UPDATE pull_request_reviewers SET created_at = now() - make_interval(hours => ?),
                    submitted_at = CASE WHEN ?::int IS NULL THEN NULL ELSE now() - make_interval(hours => ?::int) END,
                    updated_at = now() - make_interval(hours => COALESCE(?::int, ?))
                WHERE id = ?
                """, requestedHoursAgo, submittedHoursAgo, submittedHoursAgo, submittedHoursAgo, requestedHoursAgo, id);
    }

    private void comment(Long pullRequestId, String author, int hoursAgo, String body, String path, Integer line, String suggestion) {
        if (pullRequestId == null) {
            return;
        }
        Long id = reviewService.comment(pullRequestId, accounts.id(author), body, path, line, suggestion).getId();
        jdbcTemplate.update("""
                UPDATE review_comments SET created_at = now() - make_interval(hours => ?), updated_at = now() - make_interval(hours => ?)
                WHERE id = ?
                """, hoursAgo, hoursAgo, id);
    }

    private void merge(Long pullRequestId, int hoursAgo) {
        if (pullRequestId == null) {
            return;
        }
        reviewService.merge(pullRequestId);
        jdbcTemplate.update("UPDATE pull_requests SET merged_at = now() - make_interval(hours => ?) WHERE id = ?", hoursAgo, pullRequestId);
    }

    private void close(Long pullRequestId, int hoursAgo) {
        if (pullRequestId == null) {
            return;
        }
        reviewService.close(pullRequestId);
        jdbcTemplate.update("UPDATE pull_requests SET closed_at = now() - make_interval(hours => ?) WHERE id = ?", hoursAgo, pullRequestId);
    }
}
