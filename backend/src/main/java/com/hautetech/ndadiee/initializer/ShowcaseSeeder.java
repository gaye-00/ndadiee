package com.hautetech.ndadiee.initializer;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.CommentService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.project.ProjectOpeningService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La vitrine de démonstration (design 3A, 3D) : dix projets open source du continent, avec leur
 * couverture, leur équipe, leurs étoiles et les rôles qu'ils recherchent. Les treize rôles du
 * catalogue y sont représentés : la bande des rôles de l'accueil vient de ces annonces.
 *
 * Les couvertures sont des photos de Wikimedia Commons, servies par l'API (resources/static/media/demo,
 * voir CREDITS.md) ; chaque projet garde le crédit de la sienne. Tout passe par les services métier.
 * Ne s'exécute que si aucun projet n'existe.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ShowcaseSeeder {

    private static final String MEDIA = "media/demo/projects/";
    private static final String COMMONS = "https://commons.wikimedia.org/wiki/File:";

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final ProjectOpeningService openingService;
    private final VoteService voteService;
    private final CommentService commentService;
    private final SlugService slugService;
    private final JdbcTemplate jdbcTemplate;

    public void seed() {
        if (projectRepository.count() > 0) {
            log.info("[Init] Vitrine déjà initialisée, skip.");
            return;
        }
        log.info("[Init] Création de la vitrine de démonstration...");

        // ═══════════════════════════════════════════════════════════════
        //  LA COMMUNAUTÉ (DemoDataSeeder) ET LES ÉQUIPES DE LA VITRINE
        // ═══════════════════════════════════════════════════════════════

        Long awa = accounts.id("awa_diop");
        Long kofi = accounts.id("kofi_mensah");
        Long chioma = accounts.id("chioma_okafor");
        Long wanjiru = accounts.id("wanjiru_kamau");
        Long yassine = accounts.id("yassine_elamrani");
        Long aminata = accounts.id("aminata_traore");
        Long jeanPaul = accounts.id("jeanpaul_nkurunziza");
        Long thandiwe = accounts.id("thandiwe_ndlovu");
        Long samuel = accounts.id("samuel_ngono");
        Long fatou = accounts.id("fatou_sow");
        Long omar = accounts.id("omar_benali");
        Long selam = accounts.id("selam_tesfaye");

        Long chinedu = accounts.developer("chinedu_okafor", "Chinedu Okafor", Role.USER, "NG", "Lagos", ExperienceLevel.SENIOR, Language.EN, false,
                "Backend engineer in Lagos. Go, GraphQL and open data. I take the BRT every day and wanted to know when the next one actually comes.",
                "Go", "GraphQL", "PostgreSQL", "Redis");
        Long tunde = accounts.developer("tunde_adeyemi", "Tunde Adeyemi", Role.USER, "NG", "Lagos", ExperienceLevel.MID, Language.EN, false,
                "React Native developer. I make apps that stay light on a 500 MB data plan.",
                "React Native", "TypeScript", "React");
        Long ama = accounts.developer("ama_owusu", "Ama Owusu", Role.USER, "GH", "Accra", ExperienceLevel.JUNIOR, Language.EN, true,
                "Junior backend developer in Accra, learning Go one pull request at a time.",
                "Go", "PostgreSQL");
        Long kwame = accounts.developer("kwame_asante", "Kwame Asante", Role.USER, "GH", "Kumasi", ExperienceLevel.MID, Language.EN, false,
                "Data engineer in Kumasi. Transit data, GTFS feeds and the joy of a clean timetable.",
                "Python", "PostgreSQL", "Open Data");
        Long mameDiarra = accounts.developer("mame_diarra_ndiaye", "Mame Diarra Ndiaye", Role.USER, "SN", "Dakar", ExperienceLevel.SENIOR, Language.FR, false,
                "Chercheuse en traitement automatique des langues à Dakar. Je construis des outils pour que le wolof ait sa place dans le numérique.",
                "Python", "Machine Learning", "NLP");
        Long ibrahima = accounts.developer("ibrahima_fall", "Ibrahima Fall", Role.USER, "SN", "Saint-Louis", ExperienceLevel.MID, Language.FR, false,
                "Développeur mobile à Saint-Louis. Flutter, Firebase, et beaucoup d'heures passées dans les sept-places entre Dakar et Saint-Louis.",
                "Flutter", "Dart", "Firebase");
        Long emeka = accounts.developer("emeka_nwosu", "Emeka Nwosu", Role.USER, "NG", "Abuja", ExperienceLevel.SENIOR, Language.EN, false,
                "Platform engineer in Abuja. Kubernetes for teams that count every dollar of their cloud bill.",
                "Kubernetes", "Terraform", "Docker", "DevOps");
        Long aissatou = accounts.developer("aissatou_sarr", "Aïssatou Sarr", Role.USER, "SN", "Kaolack", ExperienceLevel.MID, Language.FR, true,
                "Ingénieure en systèmes embarqués à Kaolack. ESP32, capteurs et énergie solaire pour les villages.",
                "IoT", "MicroPython", "ESP32");

        // ═══════════════════════════════════════════════════════════════
        //  LES PROJETS
        // ═══════════════════════════════════════════════════════════════

        Long lagos = project(chinedu, "lagos-transit",
                "Horaires des danfo et du BRT en open data, API GraphQL et appli mobile.", """
                Les horaires des **danfo** et du **BRT** de Lagos, en données ouvertes : une API GraphQL et une appli mobile pensée pour les petits forfaits.

                - Prochains passages à chaque arrêt, mis à jour par la communauté
                - Mode hors-ligne : les 20 derniers arrêts consultés restent disponibles
                - Flux GTFS publié chaque semaine, réutilisable par d'autres applications

                Le cache Redis fait passer la page d'un arrêt de 1,8 s à 120 ms. Prochaine étape : les notifications de départ.
                """,
                cover("lagos-transit", "Kaizenify", "CC BY-SA 4.0", "Fleet_of_Danfo_buses_in_Lagos.jpeg"),
                "Go", "GraphQL", "Redis", "React Native", "GTFS", "Open Data");
        team(lagos, chinedu, kwame, ProjectRole.MAINTAINER);
        team(lagos, chinedu, tunde, ProjectRole.CONTRIBUTOR);
        team(lagos, chinedu, ama, ProjectRole.CONTRIBUTOR);
        opening(chinedu, lagos, TeamRole.MOBILE, "Dev mobile React Native", "Écran trajets, mode hors-ligne, notifications.", 1,
                33, "Afficher le prochain BRT");
        opening(chinedu, lagos, TeamRole.DESIGN, "Designer UI", "Système d'icônes et parcours trajet.", 1,
                40, "Maquette de la page arrêt");
        opening(chinedu, lagos, TeamRole.DATA, "Data · GTFS", "Normaliser les horaires danfo collectés sur le terrain.", 1,
                45, "Valider le flux GTFS");

        Long momo = project(awa, "momo-sdk",
                "SDK unifié Orange Money, Wave et MTN MoMo.", """
                Une seule interface Java et Kotlin pour les API de paiement **Mobile Money** : Orange Money, Wave et MTN MoMo.

                - Initier un paiement et suivre son statut avec le même code, quel que soit l'opérateur
                - Vérification des signatures de webhook
                - Environnement de test intégré, sans compte marchand

                Utilisé en production par deux boutiques en ligne à Dakar et Abidjan. Nous cherchons quelqu'un pour porter le SDK sur Android.
                """,
                cover("momo-sdk", "Fiona Graham", "CC BY-SA 2.0", "M-PESA_mobile_money_and_Equity_agent,_Nairobi,_Kenya.jpg"),
                "Java", "Kotlin", "Spring Boot", "Mobile Money", "API");
        team(momo, awa, kofi, ProjectRole.MAINTAINER);
        team(momo, awa, omar, ProjectRole.CONTRIBUTOR);
        opening(awa, momo, TeamRole.PAYMENTS, "Mainteneur·e Kotlin", "Porter le SDK sur Android : paiement, suivi du statut, webhooks.", 1,
                12, "Client Kotlin pour Wave");
        opening(awa, momo, TeamRole.SECURITY, "Revue de sécurité", "Vérification des signatures de webhook et stockage des clés.", 1,
                18, "Auditer la vérification HMAC");
        opening(awa, momo, TeamRole.DOCS, "Rédaction technique", "Un guide d'intégration pas à pas, en français et en anglais.", 1,
                21, "Guide : premier paiement Orange Money");

        Long wolof = project(mameDiarra, "wolof-nlp",
                "Tokenizer et corpus open source pour le wolof.", """
                Des briques libres pour traiter le **wolof** : un tokenizer qui respecte l'orthographe officielle, un normaliseur pour les écritures du quotidien (SMS, réseaux sociaux) et un corpus annoté.

                Le wolof est parlé par plus de dix millions de personnes, mais presque absent des outils de traitement des langues. Ce projet pose les bases pour qu'on puisse ensuite construire correcteurs, claviers et assistants vocaux.

                Les locuteurs qui relisent le corpus sont les contributeurs les plus précieux.
                """,
                cover("wolof-nlp", "Finn-DE", "CC BY-SA 3.0", "Fishing_boat_st_louis_senegal.JPG"),
                "Python", "Machine Learning", "NLP", "Open Source");
        team(wolof, mameDiarra, fatou, ProjectRole.CONTRIBUTOR);
        team(wolof, mameDiarra, chioma, ProjectRole.CONTRIBUTOR);
        opening(mameDiarra, wolof, TeamRole.DESIGN, "Designer UI", "Interface d'annotation du corpus, utilisable sur téléphone.", 1,
                7, "Maquette de l'écran d'annotation");
        opening(mameDiarra, wolof, TeamRole.DOCS, "Rédaction", "Guide de contribution en wolof et en français.", 1,
                9, "Traduire le guide de contribution");
        opening(mameDiarra, wolof, TeamRole.L10N, "Relecture en wolof", "Vérifier l'orthographe des phrases du corpus.", 3,
                11, "Relire 200 phrases");

        Long agri = project(jeanPaul, "AgriData",
                "Les prix des marchés agricoles d'Afrique de l'Est, par API et par SMS.", """
                Une API ouverte des **prix des marchés agricoles** en Afrique de l'Est, mise à jour chaque jour à partir de relevés de terrain.

                Les agriculteurs vendent souvent sans connaître le prix pratiqué au marché voisin. AgriData rend cette information accessible par API et par SMS.

                Écrit en Go, données dans PostgreSQL. Contributions bienvenues : collecteurs de données, nouveaux marchés, client web.
                """,
                cover("agridata", "SuSanA Secretariat", "CC BY 2.0", "Ugunja_market_(5056255193).jpg"),
                "Go", "PostgreSQL", "Open Data", "API");
        team(agri, jeanPaul, selam, ProjectRole.CONTRIBUTOR);
        opening(jeanPaul, agri, TeamRole.DATA, "Collecte des prix", "Relever les prix de nouveaux marchés, au Kenya et en Ouganda.", 2,
                27, "Ajouter le marché de Kisumu");
        opening(jeanPaul, agri, TeamRole.FRONTEND, "Dev front-end", "Un tableau de bord des prix, léger et lisible sur téléphone.", 1,
                31, "Graphique d'évolution d'un produit");
        opening(jeanPaul, agri, TeamRole.BACKEND, "Dev Go", "Passerelle SMS : recevoir une question, répondre avec le prix du jour.", 1,
                34, "Commande SMS « PRIX MAIS KIGALI »");

        Long edu = project(wanjiru, "EduOffline",
                "Lessons that work without a connection: download once, study anywhere.", """
                A Flutter app that lets students **download course content once and study without a connection**.

                Lessons, quizzes and progress are stored on the device and synchronised when a network is available. Built for schools where connectivity is shared and intermittent.

                Looking for contributors: right-to-left language support, testing on low-end devices, and background sync.
                """,
                cover("eduoffline", "Nduati.githae", "CC BY-SA 4.0", "Teacher_points_out_a_country_on_a_map.jpg"),
                "Flutter", "Dart", "Offline", "Firebase");
        team(edu, wanjiru, fatou, ProjectRole.CONTRIBUTOR);
        team(edu, wanjiru, thandiwe, ProjectRole.MAINTAINER);
        opening(wanjiru, edu, TeamRole.L10N, "Right-to-left support", "Make every screen work in Arabic, from layout to numbers.", 1,
                52, "Mirror the lesson player");
        opening(wanjiru, edu, TeamRole.QA, "Testing on low-end phones", "Run the app on 1 GB RAM devices and report what breaks.", 2,
                58, "Test plan for Android Go");
        opening(wanjiru, edu, TeamRole.MOBILE, "Flutter developer", "Background sync of progress as soon as a network shows up.", 1,
                61, "Resume interrupted downloads");

        Long habesha = project(selam, "Habesha NLP",
                "Tokenizer, normaliser and a labelled corpus for Amharic and Tigrinya.", """
                Open tools for **natural language processing in Amharic and Tigrinya**: tokeniser, normaliser for Ge'ez script variants, and a small labelled corpus.

                Most NLP libraries ignore these languages. This project collects the basic building blocks so that others do not have to start from zero.

                Native speakers who can review annotations are especially welcome.
                """,
                cover("habesha-nlp", "Bibliothèque nationale de France", "domaine public",
                        "Recueil_de_pri%C3%A8res_liturgiques_(geez)_-_btv1b100998174_(011_of_105).jpg"),
                "Python", "Machine Learning", "NLP");
        team(habesha, selam, chioma, ProjectRole.CONTRIBUTOR);
        opening(selam, habesha, TeamRole.L10N, "Amharic and Tigrinya reviewers", "Native speakers to review annotations, a few minutes a day.", 4,
                14, "Review 100 sentences");
        opening(selam, habesha, TeamRole.DATA, "Data engineer", "A pipeline to clean and deduplicate the corpus.", 1,
                19, "Deduplicate news sources");

        Long kawral = project(ibrahima, "Kawral",
                "Covoiturage entre villes du Sénégal : le sept-places se remplit avant de partir.", """
                Entre Dakar et Saint-Louis, on attend souvent des heures à la gare routière que le **sept-places** soit plein. Kawral permet de réserver sa place et de savoir quand la voiture part.

                - Réservation d'une place, départ annoncé quand la voiture est pleine
                - Paiement Wave ou Orange Money, remboursé si le départ est annulé
                - Pensé avec les chauffeurs, pas seulement pour les passagers

                Né pendant un hackathon, le projet continue avec une petite équipe.
                """,
                cover("kawral", "CelmaKoumba", "CC BY-SA 4.0",
                        "Garages_ext%C3%A9rieurs_et_voitures_%22sept-places%22_%C3%A0_Ndiandiaye.jpg"),
                "Flutter", "Dart", "Firebase", "Mobile Money");
        team(kawral, ibrahima, aminata, ProjectRole.CONTRIBUTOR);
        opening(ibrahima, kawral, TeamRole.MOBILE, "Devs Flutter", "Réservation d'une place et suivi du départ en temps réel.", 2,
                4, "Écran de réservation");
        opening(ibrahima, kawral, TeamRole.PRODUCT, "Product manager", "Parcours des chauffeurs de sept-places : entretiens et priorités.", 1,
                6, "Synthèse de 10 entretiens avec des chauffeurs");
        opening(ibrahima, kawral, TeamRole.PAYMENTS, "Paiement Wave et Orange Money", "Payer sa place à la réservation, rembourser si le départ est annulé.", 1,
                8, "Remboursement automatique");

        Long k8s = project(emeka, "naija-k8s-starter",
                "A production-ready Kubernetes cluster for under $50 a month, with Terraform.", """
                A **Kubernetes** starter for small teams: one command to get a cluster with ingress, TLS, monitoring and backups, sized for a tight budget.

                - Terraform modules for providers with African regions
                - Sensible defaults: network policies, resource limits, automatic certificates
                - A runbook for the first incident, written for people who are not full-time SREs
                """,
                cover("naija-k8s-starter", "BalticServers.com", "CC BY-SA 3.0", "BalticServers_data_center.jpg"),
                "Kubernetes", "Terraform", "Docker", "DevOps");
        team(k8s, emeka, yassine, ProjectRole.MAINTAINER);
        opening(emeka, k8s, TeamRole.DEVOPS, "DevOps engineer", "Terraform modules for cloud regions in Lagos, Johannesburg and Cairo.", 1,
                23, "Module for a Lagos region");
        opening(emeka, k8s, TeamRole.SECURITY, "Security reviewer", "Network policies and secrets management defaults.", 1,
                26, "Default deny network policy");

        Long solar = project(aissatou, "Sunu Solar",
                "Supervision de mini-réseaux solaires avec des ESP32, même sans 4G.", """
                Des capteurs à base d'**ESP32** mesurent la production et la consommation des mini-réseaux solaires de village, et transmettent par **LoRa** jusqu'à une passerelle, même là où il n'y a pas de 4G.

                Objectif : détecter une batterie fatiguée ou un panneau encrassé avant la panne. Premier site pilote à Niague, dans la région de Dakar.
                """,
                cover("sunu-solar", "Yagamar", "CC BY-SA 4.0",
                        "Champ_de_Serigne_Cheikh_Demba_%C3%A0_Niagues_Niass%C3%A8ne_12.jpg"),
                "IoT", "ESP32", "MicroPython", "LoRa");
        team(solar, aissatou, samuel, ProjectRole.CONTRIBUTOR);
        opening(aissatou, solar, TeamRole.EMBEDDED, "Firmware ESP32", "Mesurer la production et l'envoyer par LoRa vers la passerelle.", 1,
                15, "Lecture du capteur de courant");
        opening(aissatou, solar, TeamRole.QA, "Tests sur le terrain", "Installer deux capteurs pilotes et suivre une semaine de mesures.", 2,
                17, "Protocole de test à Niague");

        // Un projet qui ne recrute pas : la vitrine montre aussi des projets terminés ou en maintenance
        project(kofi, "Sahel UI",
                "React components for slow networks and low-end phones: small, accessible, no layout shift.", """
                A React component library designed for **slow networks and low-end phones**: small bundles, no layout shift, and full keyboard accessibility.

                Used in production by three products. The API is stable; the project is in maintenance mode and not currently looking for new contributors.
                """,
                cover("sahel-ui", "Myriam Louviot", "CC BY 3.0", "BaobabElephantBandia.JPG"),
                false, "React", "TypeScript", "CSS", "Performance");

        // ═══════════════════════════════════════════════════════════════
        //  ÉTOILES, DEMANDES ET COMMENTAIRES
        // ═══════════════════════════════════════════════════════════════

        star(lagos, awa, kofi, chioma, wanjiru, yassine, aminata, jeanPaul, thandiwe, samuel, fatou, omar, selam,
                mameDiarra, ibrahima, emeka, aissatou, tunde, kwame);
        star(momo, kofi, chioma, wanjiru, yassine, aminata, jeanPaul, thandiwe, samuel, fatou, omar, selam,
                chinedu, mameDiarra, ibrahima, emeka, aissatou);
        star(wolof, awa, kofi, chioma, wanjiru, aminata, jeanPaul, samuel, fatou, omar, selam, chinedu, ibrahima,
                aissatou, tunde);
        star(agri, awa, yassine, chioma, selam, kwame, chinedu, aissatou, samuel);
        star(edu, fatou, thandiwe, awa, aminata, samuel, ibrahima, mameDiarra);
        star(habesha, chioma, awa, wanjiru, mameDiarra, kwame);
        star(kawral, awa, fatou, mameDiarra, aminata, aissatou, samuel);
        star(k8s, yassine, chinedu, kofi, omar, awa);
        star(solar, ibrahima, awa, fatou, mameDiarra);

        // Demandes laissées en attente : visibles dans les notifications des porteurs
        projectService.join(samuel, agri);
        projectService.join(tunde, kawral);

        comment(kofi, lagos, "Le mode hors-ligne des derniers arrêts, c'est exactement ce qu'il faut avec un forfait de 500 Mo.");
        comment(thandiwe, momo, "Happy to review the Kotlin client once there is a first draft.");
        comment(fatou, wolof, "Je peux relire les phrases du corpus le soir, dites-moi par où commencer.");
        comment(fatou, edu, "J'ai testé sur un téléphone avec 1 Go de RAM : fluide. Je prends le ticket sur l'arabe.");

        spreadDates();
        log.info("[Init] Vitrine créée : {} projets", projectRepository.count());
    }

    // ==================== PROJETS ====================

    private record Cover(String slug, String credit, String sourceUrl) {
    }

    private static Cover cover(String slug, String author, String license, String commonsFile) {
        return new Cover(slug, author + " · " + license, COMMONS + commonsFile);
    }

    private Long project(Long ownerId, String name, String tagline, String description, Cover cover, String... tags) {
        return project(ownerId, name, tagline, description, cover, true, tags);
    }

    private Long project(Long ownerId, String name, String tagline, String description, Cover cover,
            boolean lookingForContributors, String... tags) {
        String slug = slugService.toSlug(name);
        return projectService.create(ownerId, ProjectRequest.builder()
                .name(name)
                .tagline(tagline)
                .description(description.strip())
                // Dépôts et démos fictifs : example.com est un domaine réservé à la documentation
                .repositoryUrl("https://example.com/ndadiee-demo/" + slug)
                .demoUrl("https://example.com/ndadiee-demo/" + slug + "/demo")
                .coverUrl(MEDIA + cover.slug() + ".webp")
                .coverThumbnailUrl(MEDIA + cover.slug() + "-640.webp")
                .coverCredit(cover.credit())
                .coverSourceUrl(cover.sourceUrl())
                .lookingForContributors(lookingForContributors)
                .tags(List.of(tags))
                .build()).getId();
    }

    // Demande de contribution acceptée par le porteur
    private void team(Long projectId, Long ownerId, Long developerId, ProjectRole role) {
        Long memberId = projectService.join(developerId, projectId).getId();
        projectService.decide(ownerId, projectId, memberId,
                MemberDecisionRequest.builder().status(MemberStatus.ACCEPTED).role(role).build());
    }

    private void opening(Long ownerId, Long projectId, TeamRole role, String title, String description, int seats,
            Integer starterIssueNumber, String starterIssueTitle) {
        openingService.create(ownerId, projectId, ProjectOpeningRequest.builder()
                .role(role)
                .title(title)
                .description(description)
                .seats(seats)
                .starterIssueNumber(starterIssueNumber)
                .starterIssueTitle(starterIssueTitle)
                .build());
    }

    // ==================== INTERACTIONS ====================

    private void star(Long projectId, Long... developerIds) {
        for (Long developerId : developerIds) {
            voteService.vote(developerId, VoteRequest.builder()
                    .targetType(ContentType.PROJECT).targetId(projectId).value(1).build());
        }
    }

    private void comment(Long authorId, Long projectId, String body) {
        commentService.create(authorId, CommentRequest.builder()
                .targetType(ContentType.PROJECT)
                .targetId(projectId)
                .body(body)
                .build());
    }

    // ==================== DATES ====================

    /**
     * Tout vient d'être créé à la même seconde : on étale les projets sur les derniers mois, les
     * arrivées dans les équipes après la création du projet, et les annonces sur les derniers jours.
     */
    private void spreadDates() {
        jdbcTemplate.update("""
                UPDATE projects SET created_at = now() - make_interval(days => (4 + ((SELECT max(id) FROM projects) - id) * 11)::int)
                """);
        jdbcTemplate.update("""
                UPDATE project_members m
                SET created_at = CASE WHEN m.role = 'OWNER' THEN p.created_at
                                      ELSE LEAST(now() - interval '2 days', p.created_at + make_interval(days => (1 + m.id % 6)::int)) END
                FROM projects p WHERE p.id = m.project_id
                """);
        jdbcTemplate.update("""
                UPDATE project_openings o
                SET created_at = GREATEST(p.created_at + interval '6 hours',
                                          now() - make_interval(hours => (5 + ((SELECT max(id) FROM project_openings) - o.id) * 9)::int))
                FROM projects p WHERE p.id = o.project_id
                """);
        // Commentaires et notifications : sur les dernières heures, après leur cible
        jdbcTemplate.update("""
                UPDATE comments SET created_at = now() - make_interval(mins => (10 + ((SELECT max(id) FROM comments) - id) * 41)::int)
                """);
        jdbcTemplate.update("""
                UPDATE notifications SET created_at = now() - make_interval(mins => (2 + ((SELECT max(id) FROM notifications) - id) * 2)::int)
                """);
        for (String table : List.of("projects", "project_members", "project_openings", "comments", "notifications")) {
            jdbcTemplate.update("UPDATE " + table + " SET updated_at = created_at");
        }
    }
}
