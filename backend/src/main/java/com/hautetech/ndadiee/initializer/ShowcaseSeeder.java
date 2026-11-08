package com.hautetech.ndadiee.initializer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.DevlogEntryRequest;
import com.hautetech.ndadiee.dto.request.FeedbackCallRequest;
import com.hautetech.ndadiee.dto.request.FeedbackRequest;
import com.hautetech.ndadiee.dto.request.JoinProjectRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.MemberSpecialtyRequest;
import com.hautetech.ndadiee.dto.request.ProjectMediaRequest;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.project.MediaKind;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.CommentService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.project.DevlogService;
import com.hautetech.ndadiee.service.project.FeedbackService;
import com.hautetech.ndadiee.service.project.GithubActivityService;
import com.hautetech.ndadiee.service.project.ProjectMediaService;
import com.hautetech.ndadiee.service.project.ProjectOpeningService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La vitrine de démonstration (design 3A, 3D) : dix projets open source du continent, avec leur
 * couverture, leur galerie, leur équipe (chacun dans son rôle), leurs étoiles, les rôles qu'ils
 * recherchent et les candidatures reçues, leur devlog, leurs demandes de retours, l'activité de leur
 * dépôt et leur licence. Les treize rôles du catalogue y sont représentés : la bande des rôles de l'accueil vient de ces
 * annonces.
 *
 * Les couvertures sont des photos de Wikimedia Commons ; les galeries, des captures des applications
 * dessinées pour la démonstration. Toutes sont servies par l'API (resources/static/media/demo, voir
 * CREDITS.md). Tout passe par les services métier. Ne s'exécute que si aucun projet n'existe.
 *
 * L'histoire de lagos-transit suit le design 3D : la v0.7 et son cache Redis il y a deux jours, la première
 * PR d'Ama, arrivée dans l'équipe le même jour, et 14 retours sur l'écran trajets.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ShowcaseSeeder {

    private static final String MEDIA = DemoCover.MEDIA;
    // Captures de la galerie : 1280 × 800, et leur miniature de 640 px
    private static final int SHOT_WIDTH = 1280;
    private static final int SHOT_HEIGHT = 800;

    private final DemoAccounts accounts;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final ProjectOpeningService openingService;
    private final ProjectMediaService mediaService;
    private final DevlogService devlogService;
    private final FeedbackService feedbackService;
    private final GithubActivityService githubService;
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
        //  LES PROJETS, LEURS ÉQUIPES ET LEURS ANNONCES
        // ═══════════════════════════════════════════════════════════════

        Long lagos = project(chinedu, "lagos-transit", "MIT",
                "Horaires des danfo et du BRT en open data, API GraphQL et appli mobile.", """
                Les horaires des **danfo** et du **BRT** de Lagos, en données ouvertes : une API GraphQL et une appli mobile pensée pour les petits forfaits.

                - Prochains passages à chaque arrêt, mis à jour par la communauté
                - Mode hors-ligne : les 20 derniers arrêts consultés restent disponibles
                - Flux GTFS publié chaque semaine, réutilisable par d'autres applications

                Le cache Redis fait passer la page d'un arrêt de 1,8 s à 120 ms. Prochaine étape : les notifications de départ.
                """,
                cover("lagos-transit", "Kaizenify", "CC BY-SA 4.0", "Fleet_of_Danfo_buses_in_Lagos.jpeg"),
                "Go", "GraphQL", "Redis", "React Native", "GTFS", "Open Data");
        specialty(chinedu, lagos, TeamRole.BACKEND);
        team(lagos, chinedu, kwame, ProjectRole.MAINTAINER, TeamRole.DATA);
        team(lagos, chinedu, tunde, ProjectRole.CONTRIBUTOR, TeamRole.MOBILE);
        team(lagos, chinedu, ama, ProjectRole.CONTRIBUTOR, TeamRole.BACKEND);
        opening(chinedu, lagos, TeamRole.MOBILE, "Dev mobile React Native", "Écran trajets, mode hors-ligne, notifications.", 1,
                33, "Afficher le prochain BRT");
        Long lagosDesign = opening(chinedu, lagos, TeamRole.DESIGN, "Designer UI", "Système d'icônes et parcours trajet.", 1,
                40, "Maquette de la page arrêt");
        Long lagosData = opening(chinedu, lagos, TeamRole.DATA, "Data · GTFS", "Normaliser les horaires danfo collectés sur le terrain.", 1,
                45, "Valider le flux GTFS");

        Long momo = project(awa, "momo-sdk", "Apache-2.0",
                "SDK unifié Orange Money, Wave et MTN MoMo.", """
                Une seule interface Java et Kotlin pour les API de paiement **Mobile Money** : Orange Money, Wave et MTN MoMo.

                - Initier un paiement et suivre son statut avec le même code, quel que soit l'opérateur
                - Vérification des signatures de webhook
                - Environnement de test intégré, sans compte marchand

                Utilisé en production par deux boutiques en ligne à Dakar et Abidjan. Nous cherchons quelqu'un pour porter le SDK sur Android.
                """,
                cover("momo-sdk", "Fiona Graham", "CC BY-SA 2.0", "M-PESA_mobile_money_and_Equity_agent,_Nairobi,_Kenya.jpg"),
                "Java", "Kotlin", "Spring Boot", "Mobile Money", "API");
        specialty(awa, momo, TeamRole.BACKEND);
        team(momo, awa, kofi, ProjectRole.MAINTAINER, TeamRole.FRONTEND);
        team(momo, awa, omar, ProjectRole.CONTRIBUTOR, TeamRole.BACKEND);
        Long momoKotlin = opening(awa, momo, TeamRole.PAYMENTS, "Mainteneur·e Kotlin", "Porter le SDK sur Android : paiement, suivi du statut, webhooks.", 1,
                12, "Client Kotlin pour Wave");
        opening(awa, momo, TeamRole.SECURITY, "Revue de sécurité", "Vérification des signatures de webhook et stockage des clés.", 1,
                18, "Auditer la vérification HMAC");
        opening(awa, momo, TeamRole.DOCS, "Rédaction technique", "Un guide d'intégration pas à pas, en français et en anglais.", 1,
                21, "Guide : premier paiement Orange Money");

        Long wolof = project(mameDiarra, "wolof-nlp", "MIT",
                "Tokenizer et corpus open source pour le wolof.", """
                Des briques libres pour traiter le **wolof** : un tokenizer qui respecte l'orthographe officielle, un normaliseur pour les écritures du quotidien (SMS, réseaux sociaux) et un corpus annoté.

                Le wolof est parlé par plus de dix millions de personnes, mais presque absent des outils de traitement des langues. Ce projet pose les bases pour qu'on puisse ensuite construire correcteurs, claviers et assistants vocaux.

                Les locuteurs qui relisent le corpus sont les contributeurs les plus précieux.
                """,
                cover("wolof-nlp", "Finn-DE", "CC BY-SA 3.0", "Fishing_boat_st_louis_senegal.JPG"),
                "Python", "Machine Learning", "NLP", "Open Source");
        specialty(mameDiarra, wolof, TeamRole.DATA);
        team(wolof, mameDiarra, fatou, ProjectRole.CONTRIBUTOR, TeamRole.L10N);
        team(wolof, mameDiarra, chioma, ProjectRole.CONTRIBUTOR, TeamRole.DATA);
        opening(mameDiarra, wolof, TeamRole.DESIGN, "Designer UI", "Interface d'annotation du corpus, utilisable sur téléphone.", 1,
                7, "Maquette de l'écran d'annotation");
        opening(mameDiarra, wolof, TeamRole.DOCS, "Rédaction", "Guide de contribution en wolof et en français.", 1,
                9, "Traduire le guide de contribution");
        Long wolofReview = opening(mameDiarra, wolof, TeamRole.L10N, "Relecture en wolof", "Vérifier l'orthographe des phrases du corpus.", 3,
                11, "Relire 200 phrases");

        Long agri = project(jeanPaul, "AgriData", "AGPL-3.0",
                "Les prix des marchés agricoles d'Afrique de l'Est, par API et par SMS.", """
                Une API ouverte des **prix des marchés agricoles** en Afrique de l'Est, mise à jour chaque jour à partir de relevés de terrain.

                Les agriculteurs vendent souvent sans connaître le prix pratiqué au marché voisin. AgriData rend cette information accessible par API et par SMS.

                Écrit en Go, données dans PostgreSQL. Contributions bienvenues : collecteurs de données, nouveaux marchés, client web.
                """,
                cover("agridata", "SuSanA Secretariat", "CC BY 2.0", "Ugunja_market_(5056255193).jpg"),
                "Go", "PostgreSQL", "Open Data", "API");
        specialty(jeanPaul, agri, TeamRole.BACKEND);
        team(agri, jeanPaul, selam, ProjectRole.CONTRIBUTOR, TeamRole.DATA);
        Long agriPrices = opening(jeanPaul, agri, TeamRole.DATA, "Collecte des prix", "Relever les prix de nouveaux marchés, au Kenya et en Ouganda.", 2,
                27, "Ajouter le marché de Kisumu");
        opening(jeanPaul, agri, TeamRole.FRONTEND, "Dev front-end", "Un tableau de bord des prix, léger et lisible sur téléphone.", 1,
                31, "Graphique d'évolution d'un produit");
        opening(jeanPaul, agri, TeamRole.BACKEND, "Dev Go", "Passerelle SMS : recevoir une question, répondre avec le prix du jour.", 1,
                34, "Commande SMS « PRIX MAIS KIGALI »");

        Long edu = project(wanjiru, "EduOffline", "MIT",
                "Lessons that work without a connection: download once, study anywhere.", """
                A Flutter app that lets students **download course content once and study without a connection**.

                Lessons, quizzes and progress are stored on the device and synchronised when a network is available. Built for schools where connectivity is shared and intermittent.

                Looking for contributors: right-to-left language support, testing on low-end devices, and background sync.
                """,
                cover("eduoffline", "Nduati.githae", "CC BY-SA 4.0", "Teacher_points_out_a_country_on_a_map.jpg"),
                "Flutter", "Dart", "Offline", "Firebase");
        specialty(wanjiru, edu, TeamRole.MOBILE);
        team(edu, wanjiru, fatou, ProjectRole.CONTRIBUTOR, TeamRole.MOBILE);
        team(edu, wanjiru, thandiwe, ProjectRole.MAINTAINER, TeamRole.MOBILE);
        Long eduRtl = opening(wanjiru, edu, TeamRole.L10N, "Right-to-left support", "Make every screen work in Arabic, from layout to numbers.", 1,
                52, "Mirror the lesson player");
        opening(wanjiru, edu, TeamRole.QA, "Testing on low-end phones", "Run the app on 1 GB RAM devices and report what breaks.", 2,
                58, "Test plan for Android Go");
        opening(wanjiru, edu, TeamRole.MOBILE, "Flutter developer", "Background sync of progress as soon as a network shows up.", 1,
                61, "Resume interrupted downloads");

        Long habesha = project(selam, "Habesha NLP", "Apache-2.0",
                "Tokenizer, normaliser and a labelled corpus for Amharic and Tigrinya.", """
                Open tools for **natural language processing in Amharic and Tigrinya**: tokeniser, normaliser for Ge'ez script variants, and a small labelled corpus.

                Most NLP libraries ignore these languages. This project collects the basic building blocks so that others do not have to start from zero.

                Native speakers who can review annotations are especially welcome.
                """,
                cover("habesha-nlp", "Bibliothèque nationale de France", "domaine public",
                        "Recueil_de_pri%C3%A8res_liturgiques_(geez)_-_btv1b100998174_(011_of_105).jpg"),
                "Python", "Machine Learning", "NLP");
        specialty(selam, habesha, TeamRole.DATA);
        team(habesha, selam, chioma, ProjectRole.CONTRIBUTOR, TeamRole.DATA);
        opening(selam, habesha, TeamRole.L10N, "Amharic and Tigrinya reviewers", "Native speakers to review annotations, a few minutes a day.", 4,
                14, "Review 100 sentences");
        opening(selam, habesha, TeamRole.DATA, "Data engineer", "A pipeline to clean and deduplicate the corpus.", 1,
                19, "Deduplicate news sources");

        Long kawral = project(ibrahima, "Kawral", "GPL-3.0",
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
        specialty(ibrahima, kawral, TeamRole.MOBILE);
        team(kawral, ibrahima, aminata, ProjectRole.CONTRIBUTOR, TeamRole.BACKEND);
        Long kawralFlutter = opening(ibrahima, kawral, TeamRole.MOBILE, "Devs Flutter", "Réservation d'une place et suivi du départ en temps réel.", 2,
                4, "Écran de réservation");
        opening(ibrahima, kawral, TeamRole.PRODUCT, "Product manager", "Parcours des chauffeurs de sept-places : entretiens et priorités.", 1,
                6, "Synthèse de 10 entretiens avec des chauffeurs");
        opening(ibrahima, kawral, TeamRole.PAYMENTS, "Paiement Wave et Orange Money", "Payer sa place à la réservation, rembourser si le départ est annulé.", 1,
                8, "Remboursement automatique");

        Long k8s = project(emeka, "naija-k8s-starter", "Apache-2.0",
                "A production-ready Kubernetes cluster for under $50 a month, with Terraform.", """
                A **Kubernetes** starter for small teams: one command to get a cluster with ingress, TLS, monitoring and backups, sized for a tight budget.

                - Terraform modules for providers with African regions
                - Sensible defaults: network policies, resource limits, automatic certificates
                - A runbook for the first incident, written for people who are not full-time SREs
                """,
                cover("naija-k8s-starter", "BalticServers.com", "CC BY-SA 3.0", "BalticServers_data_center.jpg"),
                "Kubernetes", "Terraform", "Docker", "DevOps");
        specialty(emeka, k8s, TeamRole.DEVOPS);
        team(k8s, emeka, yassine, ProjectRole.MAINTAINER, TeamRole.DEVOPS);
        opening(emeka, k8s, TeamRole.DEVOPS, "DevOps engineer", "Terraform modules for cloud regions in Lagos, Johannesburg and Cairo.", 1,
                23, "Module for a Lagos region");
        opening(emeka, k8s, TeamRole.SECURITY, "Security reviewer", "Network policies and secrets management defaults.", 1,
                26, "Default deny network policy");

        Long solar = project(aissatou, "Sunu Solar", "MIT",
                "Supervision de mini-réseaux solaires avec des ESP32, même sans 4G.", """
                Des capteurs à base d'**ESP32** mesurent la production et la consommation des mini-réseaux solaires de village, et transmettent par **LoRa** jusqu'à une passerelle, même là où il n'y a pas de 4G.

                Objectif : détecter une batterie fatiguée ou un panneau encrassé avant la panne. Premier site pilote à Niague, dans la région de Dakar.
                """,
                cover("sunu-solar", "Yagamar", "CC BY-SA 4.0",
                        "Champ_de_Serigne_Cheikh_Demba_%C3%A0_Niagues_Niass%C3%A8ne_12.jpg"),
                "IoT", "ESP32", "MicroPython", "LoRa");
        specialty(aissatou, solar, TeamRole.EMBEDDED);
        team(solar, aissatou, samuel, ProjectRole.CONTRIBUTOR, TeamRole.DATA);
        opening(aissatou, solar, TeamRole.EMBEDDED, "Firmware ESP32", "Mesurer la production et l'envoyer par LoRa vers la passerelle.", 1,
                15, "Lecture du capteur de courant");
        opening(aissatou, solar, TeamRole.QA, "Tests sur le terrain", "Installer deux capteurs pilotes et suivre une semaine de mesures.", 2,
                17, "Protocole de test à Niague");

        // Un projet qui ne recrute pas : la vitrine montre aussi des projets terminés ou en maintenance
        Long sahel = project(kofi, "Sahel UI", "MIT",
                "React components for slow networks and low-end phones: small, accessible, no layout shift.", """
                A React component library designed for **slow networks and low-end phones**: small bundles, no layout shift, and full keyboard accessibility.

                Used in production by three products. The API is stable; the project is in maintenance mode and not currently looking for new contributors.
                """,
                cover("sahel-ui", "Myriam Louviot", "CC BY 3.0", "BaobabElephantBandia.JPG"),
                false, "React", "TypeScript", "CSS", "Performance");
        specialty(kofi, sahel, TeamRole.FRONTEND);

        // ═══════════════════════════════════════════════════════════════
        //  CANDIDATURES : un rôle visé, un mot pour l'équipe
        // ═══════════════════════════════════════════════════════════════

        apply(kofi, lagos, lagosDesign,
                "Je construis des design systems à Accra et je prends le BRT quand je suis à Lagos. Je commence par la page arrêt ?");
        apply(aminata, lagos, lagosDesign,
                "J'ai dessiné les écrans d'une appli de transport à Abidjan : je serais ravie de m'occuper des icônes.");
        apply(jeanPaul, lagos, lagosData,
                "Je normalise des relevés de terrain pour AgriData : les horaires des danfo, c'est le même problème.");
        apply(thandiwe, momo, momoKotlin,
                "Android lead, Kotlin every day. Happy to own the Kotlin client, starting with Wave.");
        apply(ibrahima, wolof, wolofReview,
                "Je parle wolof tous les jours à Saint-Louis : je peux relire 200 phrases cette semaine.");
        apply(samuel, agri, agriPrices,
                "Étudiant à Douala, je cherche une première expérience : je peux relever les prix de deux marchés.");
        apply(omar, edu, eduRtl,
                "Arabic is my first language and I build RTL interfaces in Tunis. I can start with the lesson player.");
        apply(tunde, kawral, kawralFlutter,
                "React Native au quotidien, et curieux de Flutter : l'écran de réservation me parle.");

        // ═══════════════════════════════════════════════════════════════
        //  GALERIES : captures des applications, après la couverture
        // ═══════════════════════════════════════════════════════════════

        gallery(chinedu, lagos,
                shot("lagos-transit-1", "Les prochains passages à l'arrêt Obalende, en direct"),
                shot("lagos-transit-2", "Mode hors-ligne : les arrêts consultés restent lisibles"),
                shot("lagos-transit-3", "L'API GraphQL : les prochains départs d'un arrêt"));
        gallery(awa, momo,
                shot("momo-sdk-1", "Un paiement Wave suivi jusqu'à la confirmation"),
                shot("momo-sdk-2", "La boutique de démonstration : trois opérateurs, un seul SDK"));
        gallery(mameDiarra, wolof,
                shot("wolof-nlp-1", "Le tokenizer et le normaliseur dans un terminal Python"),
                shot("wolof-nlp-2", "La relecture du corpus, phrase par phrase, sur téléphone"));
        gallery(jeanPaul, agri,
                shot("agridata-1", "Le tableau de bord des prix du maïs sur trois marchés"),
                shot("agridata-2", "L'API : le prix du jour et l'export CSV"));
        gallery(wanjiru, edu,
                shot("eduoffline-1", "Lessons downloaded once, studied offline"),
                shot("eduoffline-2", "A quiz answered in airplane mode, synced later"));
        gallery(selam, habesha,
                shot("habesha-nlp-1", "Normaliser and tokenizer, with their tests"),
                shot("habesha-nlp-2", "The Amharic corpus and its latest reviews"));
        gallery(ibrahima, kawral,
                shot("kawral-1", "Réserver sa place dans un sept-places Dakar → Saint-Louis"),
                shot("kawral-2", "Le chauffeur voit sa voiture se remplir"));
        gallery(emeka, k8s,
                shot("naija-k8s-starter-1", "One Terraform command, a running cluster"),
                shot("naija-k8s-starter-2", "Monitoring: $47.20 a month for three nodes"));
        gallery(aissatou, solar,
                shot("sunu-solar-1", "Production et consommation du mini-réseau de Niague"),
                shot("sunu-solar-2", "Le firmware MicroPython et ses mesures envoyées par LoRa"));
        gallery(kofi, sahel,
                shot("sahel-ui-1", "The Button documentation page"),
                shot("sahel-ui-2", "An order summary built with Sahel UI, and its audit"));

        // ═══════════════════════════════════════════════════════════════
        //  DEVLOGS : version après version, les plus anciennes d'abord
        // ═══════════════════════════════════════════════════════════════

        devlog(lagos, chinedu, null, 80,
                "Premier relevé de terrain : 12 bénévoles ont noté les passages des danfo à Obalende pendant une semaine.");
        devlog(lagos, chinedu, "v0.3", 52, "L'API GraphQL ouvre en lecture : lignes, arrêts et prochains passages.");
        devlog(lagos, kwame, "v0.4", 34, "Les horaires du BRT Ikorodu–CMS arrivent dans l'API : 32 arrêts, mis à jour chaque matin.");
        devlog(lagos, kwame, "v0.5", 21, "Premier flux GTFS validé avec 140 lignes de danfo.");
        devlog(lagos, tunde, "v0.6", 9, "Mode hors-ligne : les 20 derniers arrêts consultés restent disponibles.");
        devlog(lagos, chinedu, "v0.7", 2, "Cache Redis : 1,8 s → 120 ms sur la page arrêt. Merci @ama_owusu pour sa première PR.");

        devlog(momo, kofi, null, 60, "La démo en ligne permet d'essayer un paiement sans compte marchand.");
        devlog(momo, awa, "v1.0", 40, "Première version stable : deux boutiques en ligne l'utilisent en production, à Dakar et à Abidjan.");
        devlog(momo, omar, "v1.1", 16, "Vérification des signatures de webhook en une ligne : `MomoWebhook.verify(payload, signature)`.");
        devlog(momo, awa, "v1.2", 3, "Wave rejoint Orange Money et MTN MoMo : un seul appel pour initier un paiement, quel que soit l'opérateur.");

        devlog(wolof, fatou, null, 70, "Premier atelier de relecture à Thiès : 9 participants, 800 phrases relues en un après-midi.");
        devlog(wolof, mameDiarra, "v0.2", 45, "Le tokenizer respecte l'orthographe officielle : apostrophes, voyelles longues, mots composés.");
        devlog(wolof, chioma, "v0.3", 18, "Corpus : 12 000 phrases annotées, relues par 6 locuteurs.");
        devlog(wolof, mameDiarra, "v0.4", 5, "Le normaliseur comprend l'écriture SMS : « dama beug dem » redevient « dama bëgg dem ».");

        devlog(agri, jeanPaul, "v0.6", 49, "Export CSV quotidien des prix, pour les coopératives qui travaillent sur tableur.");
        devlog(agri, selam, "v0.8", 20, "Les relevés aberrants sont repérés : un prix trois fois plus haut que la veille attend une vérification.");
        devlog(agri, jeanPaul, "v0.9", 4, "Kisumu et Eldoret rejoignent l'API : 18 marchés suivis, 46 produits.");

        devlog(edu, thandiwe, "v1.8", 50, "The app now starts in under 2 seconds on a 1 GB RAM Android Go phone.");
        devlog(edu, fatou, "v2.0", 25, "Quizzes work fully offline: answers sync the next time a network shows up.");
        devlog(edu, wanjiru, "v2.1", 6, "Interrupted downloads now resume where they stopped, even after the phone restarts.");

        devlog(habesha, chioma, "v0.2", 30, "First labelled corpus: 5,000 Amharic sentences with part-of-speech tags.");
        devlog(habesha, selam, "v0.3", 7, "The normaliser now maps variant Ge'ez letters (ሠ/ሰ, ሐ/ሀ) to a single form.");

        devlog(kawral, ibrahima, null, 30,
                "Dix entretiens avec des chauffeurs à la gare des Baux maraîchers : ils veulent d'abord savoir quand la voiture sera pleine.");
        devlog(kawral, aminata, "v0.4", 15, "Réservation d'une place payée par Wave, confirmée en moins de 10 secondes.");
        devlog(kawral, ibrahima, "v0.5", 3, "Le chauffeur annonce le départ d'un geste : les passagers reçoivent un SMS 15 minutes avant.");

        devlog(k8s, emeka, "v0.4", 22, "The whole stack now fits on three nodes for $47 a month.");
        devlog(k8s, yassine, "v0.5", 12, "Automatic TLS with cert-manager, renewed 30 days before expiry.");
        devlog(k8s, emeka, "v0.6", 2, "Default resource limits for every namespace: no more pods eating a whole node.");

        devlog(solar, samuel, null, 10, "Tableau de bord : la courbe de production d'une journée s'affiche même avec une connexion 2G.");
        devlog(solar, aissatou, "v0.3", 4, "Premier capteur installé à Niague : la production du mini-réseau remonte toutes les 5 minutes par LoRa.");

        devlog(sahel, kofi, "v3.2.0", 3, "Smaller bundle: the Button component drops to 1.1 kB gzipped.");
        devlog(sahel, kofi, "v3.2.1", 1, "Focus rings are now visible in Windows high contrast mode.");

        // ═══════════════════════════════════════════════════════════════
        //  DEMANDES DE RETOURS ET RETOURS DE LA COMMUNAUTÉ
        // ═══════════════════════════════════════════════════════════════

        Long lagosCall = feedbackCall(lagos, chinedu, 6, "Votre avis sur l'écran trajets",
                "Testez la démo et dites-nous ce qui manque.");
        feedback(lagos, lagosCall, awa, 5, "L'écran trajets est clair. J'ajouterais le prix en naira dès la liste des résultats.");
        feedback(lagos, lagosCall, kofi, 4, "Love the offline list. The countdown to the next BRT should be bigger than the line name.");
        feedback(lagos, lagosCall, chioma, 5, "Used it from Yaba to CMS this morning: the 4 minutes were right.");
        feedback(lagos, lagosCall, wanjiru, 4, "Works well on my old Android. A dark mode would save battery at night.");
        feedback(lagos, lagosCall, yassine, 4, "Rapide, même en 3G. Il manque un bouton pour partager un trajet.");
        feedback(lagos, lagosCall, aminata, 3, "J'ai cherché longtemps comment changer l'arrêt de départ : le champ pourrait être plus visible.");
        feedback(lagos, lagosCall, jeanPaul, 5, "Les données GTFS sont propres, bravo. Sur l'écran trajets, il manque les correspondances à pied.");
        feedback(lagos, lagosCall, thandiwe, 4, "Smooth on a Galaxy A10, no jank. Please add a widget for favourite stops.");
        feedback(lagos, lagosCall, samuel, 4, "Simple à comprendre du premier coup. Les pastilles BRT et danfo se distinguent bien.");
        feedback(lagos, lagosCall, fatou, 5, "Le mode hors-ligne m'a sauvée dans un bus sans réseau. Rien à redire.");
        feedback(lagos, lagosCall, omar, 3, "Sur grand écran, la liste des arrêts est trop étroite. Sur téléphone, parfait.");
        feedback(lagos, lagosCall, selam, 4, "I would love a rough idea of how full the bus is.");
        feedback(lagos, lagosCall, mameDiarra, 5, "Très lisible. Une version en yoruba et en pidgin toucherait encore plus de monde.");
        feedback(lagos, lagosCall, ibrahima, 4, "Pensez à afficher l'heure d'arrivée, pas seulement la durée du trajet.");

        Long momoCall = feedbackCall(momo, awa, 8, "Le guide d'intégration est-il clair ?",
                "Suivez le guide jusqu'au premier paiement de test et dites-nous où vous avez bloqué.");
        feedback(momo, momoCall, chioma, 4, "Clear until the webhook part. A Kotlin example of the signature check would help.");
        feedback(momo, momoCall, thandiwe, 4, "I was not sure which test phone numbers simulate a failed payment.");
        feedback(momo, momoCall, samuel, 5, "Mon premier paiement de test a marché en 15 minutes, en suivant le guide.");

        Long wolofCall = feedbackCall(wolof, mameDiarra, 10, "Le tokenizer coupe-t-il bien vos phrases ?",
                "Essayez-le sur trois phrases de votre quotidien et dites-nous où il se trompe.");
        feedback(wolof, wolofCall, awa, 4, "Très bon sur mes phrases du quotidien ; il hésite sur les mots empruntés au français.");
        feedback(wolof, wolofCall, ibrahima, 5, "« Dama bëgg dem Ndakaaru » est bien découpé. Bravo pour le normaliseur SMS.");
        feedback(wolof, wolofCall, aissatou, 4, "Il se trompe sur les noms de villages : une liste de lieux aiderait.");
        feedback(wolof, wolofCall, yassine, 3, "Je ne parle pas wolof, mais l'installation a pris deux minutes : c'est très bien documenté.");
        feedback(wolof, wolofCall, jeanPaul, 4, "Publier le corpus en données ouvertes est une excellente idée ; précisez la licence des phrases.");
        feedback(wolof, wolofCall, kofi, 4, "Tried it on WhatsApp messages from friends in Dakar: mostly right, emojis break it.");

        Long eduCall = feedbackCall(edu, wanjiru, 12, "Try the offline lesson player",
                "Download a lesson, switch to airplane mode and tell us what breaks.");
        feedback(edu, eduCall, kofi, 5, "Airplane mode test passed: lessons, quiz and progress were all there.");
        feedback(edu, eduCall, chioma, 4, "The download resumed after I lost signal. The progress bar jumps back for a second, though.");
        feedback(edu, eduCall, yassine, 4, "Fonctionne hors-ligne, mais la synchronisation au retour du réseau prend du temps.");
        feedback(edu, eduCall, aminata, 5, "Mes élèves l'ont essayé : ils adorent le quiz.");
        feedback(edu, eduCall, samuel, 4, "Très léger sur mon téléphone d'entrée de gamme.");
        feedback(edu, eduCall, omar, 3, "En arabe, la mise en page des leçons reste de gauche à droite.");
        feedback(edu, eduCall, selam, 4, "Works offline. I would like to delete downloaded lessons to free some space.");
        feedback(edu, eduCall, ibrahima, 5, "Testé dans un village sans 4G : parfait.");
        feedback(edu, eduCall, jeanPaul, 4, "Clair et rapide. Un résumé de la leçon avant le quiz serait utile.");

        Long kawralCall = feedbackCall(kawral, ibrahima, 5, "Le parcours de réservation est-il clair ?",
                "Réservez une place fictive Dakar → Saint-Louis et racontez-nous où vous avez hésité.");
        feedback(kawral, kawralCall, awa, 4, "Réservation claire. J'aurais aimé choisir ma place.");
        feedback(kawral, kawralCall, chinedu, 5, "Same pain as the danfo in Lagos! Booking took me 30 seconds.");
        feedback(kawral, kawralCall, aissatou, 4, "Le SMS de départ est une super idée ; prévoyez aussi un appel pour ceux qui ne lisent pas.");
        feedback(kawral, kawralCall, jeanPaul, 3, "Je n'ai pas compris si le prix change selon la place.");

        // ═══════════════════════════════════════════════════════════════
        //  ACTIVITÉ GITHUB, À LA DERNIÈRE SYNCHRONISATION
        // ═══════════════════════════════════════════════════════════════

        github(lagos, 268, 41, 23, 6, 9, "v0.7", 2, 3, 25, 12, 18, 9, 22, 15, 27, 19, 24, 31, 26, 29, 34);
        github(momo, 412, 57, 31, 4, 14, "v1.2", 3, 5, 40, 21, 25, 19, 28, 30, 24, 33, 29, 35, 27, 31, 26);
        github(wolof, 187, 23, 18, 7, 11, "v0.4", 5, 9, 70, 8, 11, 6, 14, 9, 12, 15, 10, 13, 17, 12, 19);
        github(agri, 96, 14, 12, 5, 6, "v0.9", 4, 26, 120, 6, 9, 7, 11, 8, 10, 12, 9, 14, 11, 13, 16);
        github(edu, 154, 31, 27, 8, 12, "v2.1", 6, 11, 50, 14, 17, 12, 19, 22, 16, 20, 24, 18, 21, 25, 23);
        github(habesha, 73, 9, 9, 3, 4, "v0.3", 7, 50, 180, 3, 5, 2, 6, 4, 7, 5, 3, 6, 8, 5, 9);
        github(kawral, 64, 8, 15, 5, 3, "v0.5", 3, 6, 60, 2, 4, 3, 7, 9, 6, 11, 8, 12, 10, 14, 13);
        github(k8s, 321, 48, 21, 4, 10, "v0.6", 2, 4, 30, 16, 12, 19, 14, 22, 18, 15, 24, 20, 17, 23, 21);
        github(solar, 58, 7, 8, 3, 2, "v0.3", 4, 28, 240, 1, 3, 2, 4, 2, 5, 3, 6, 4, 5, 7, 6);
        github(sahel, 534, 62, 6, 1, 17, "v3.2.1", 1, 20, 20, 9, 7, 10, 6, 8, 5, 7, 4, 6, 3, 5, 4);

        // ═══════════════════════════════════════════════════════════════
        //  ÉTOILES ET COMMENTAIRES
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

        comment(kofi, lagos, "Le mode hors-ligne des derniers arrêts, c'est exactement ce qu'il faut avec un forfait de 500 Mo.");
        comment(thandiwe, momo, "Happy to review the Kotlin client once there is a first draft.");
        comment(fatou, wolof, "Je peux relire les phrases du corpus le soir, dites-moi par où commencer.");
        comment(fatou, edu, "J'ai testé sur un téléphone avec 1 Go de RAM : fluide. Je prends le ticket sur l'arabe.");

        spreadDates(lagos, ama);
        log.info("[Init] Vitrine créée : {} projets", projectRepository.count());
    }

    // ==================== PROJETS ====================

    private static DemoCover cover(String slug, String author, String license, String commonsFile) {
        return DemoCover.of(slug, author, license, commonsFile);
    }

    private Long project(Long ownerId, String name, String license, String tagline, String description, DemoCover cover,
            String... tags) {
        return project(ownerId, name, license, tagline, description, cover, true, tags);
    }

    private Long project(Long ownerId, String name, String license, String tagline, String description, DemoCover cover,
            boolean lookingForContributors, String... tags) {
        String slug = slugService.toSlug(name);
        return projectService.create(ownerId, cover.applyTo(ProjectRequest.builder())
                .name(name)
                .tagline(tagline)
                .description(description.strip())
                // Dépôts et démos fictifs : example.com est un domaine réservé à la documentation
                .repositoryUrl("https://example.com/ndadiee-demo/" + slug)
                .demoUrl("https://example.com/ndadiee-demo/" + slug + "/demo")
                .license(license)
                .lookingForContributors(lookingForContributors)
                .tags(List.of(tags))
                .build()).getId();
    }

    // Le rôle que le porteur tient dans son équipe : « fondateur · backend »
    private void specialty(Long ownerId, Long projectId, TeamRole specialty) {
        projectService.updateMySpecialty(ownerId, projectId, MemberSpecialtyRequest.builder().specialty(specialty).build());
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

    // Candidature à un rôle, laissée en attente : visible dans les notifications du porteur
    private void apply(Long developerId, Long projectId, Long openingId, String motivation) {
        projectService.join(developerId, projectId, JoinProjectRequest.builder()
                .openingId(openingId)
                .motivation(motivation)
                .build());
    }

    // ==================== GALERIES ====================

    private record Shot(String file, String caption) {
    }

    private static Shot shot(String file, String caption) {
        return new Shot(file, caption);
    }

    private void gallery(Long ownerId, Long projectId, Shot... shots) {
        for (Shot shot : shots) {
            mediaService.add(ownerId, projectId, ProjectMediaRequest.builder()
                    .kind(MediaKind.SCREENSHOT)
                    .url(MEDIA + "gallery/" + shot.file() + ".webp")
                    .thumbnailUrl(MEDIA + "gallery/" + shot.file() + "-640.webp")
                    .caption(shot.caption())
                    .width(SHOT_WIDTH)
                    .height(SHOT_HEIGHT)
                    .build());
        }
    }

    // ==================== DEVLOG ET RETOURS ====================

    // Une entrée du devlog, datée d'il y a quelques jours (un peu moins : « il y a 2 jours » le reste
    // une bonne partie de la journée qui suit le démarrage)
    private void devlog(Long projectId, Long authorId, String version, int daysAgo, String body) {
        Long id = devlogService.create(authorId, projectId, DevlogEntryRequest.builder().version(version).body(body).build()).getId();
        backdate("devlog_entries", id, Duration.ofDays(daysAgo).minusHours(4).plusMinutes(id % 50));
    }

    private Long feedbackCall(Long projectId, Long authorId, int daysAgo, String title, String prompt) {
        Long id = feedbackService.createCall(authorId, projectId, FeedbackCallRequest.builder().title(title).prompt(prompt).build()).getId();
        backdate("feedback_calls", id, Duration.ofDays(daysAgo).minusHours(3));
        return id;
    }

    private void feedback(Long projectId, Long callId, Long authorId, Integer rating, String body) {
        feedbackService.give(authorId, projectId, callId, FeedbackRequest.builder().rating(rating).body(body).build());
    }

    private void backdate(String table, Long id, Duration age) {
        jdbcTemplate.update("UPDATE " + table + " SET created_at = now() - make_interval(mins => ?), updated_at = now() - make_interval(mins => ?) WHERE id = ?",
                (int) age.toMinutes(), (int) age.toMinutes(), id);
    }

    // ==================== GITHUB ====================

    /**
     * Relevé de l'activité du dépôt : dernière release il y a quelques jours, dernier commit il y a
     * quelques heures, synchronisé il y a quelques minutes ; puis les commits des 12 dernières semaines.
     */
    private void github(Long projectId, int stars, int forks, int openIssues, int goodFirstIssues, int contributors,
            String lastRelease, int releaseDaysAgo, int commitHoursAgo, int syncedMinutesAgo, Integer... commitWeeks) {
        Instant now = Instant.now();
        githubService.record(projectId, new GithubActivityService.Snapshot(stars, forks, openIssues, goodFirstIssues, contributors,
                List.of(commitWeeks), lastRelease, now.minus(Duration.ofDays(releaseDaysAgo)).plus(Duration.ofHours(4)),
                now.minus(Duration.ofHours(commitHoursAgo)), now.minus(Duration.ofMinutes(syncedMinutesAgo))));
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
     * arrivées dans les équipes après la création du projet, les candidatures et les annonces sur les
     * derniers jours, et les retours après leur demande. Le devlog et les demandes de retours ont déjà
     * leur date. Ama a rejoint lagos-transit il y a deux jours, le jour de sa première PR (design 3D).
     */
    private void spreadDates(Long lagosId, Long amaId) {
        jdbcTemplate.update("""
                UPDATE projects SET created_at = now() - make_interval(days => (4 + ((SELECT max(id) FROM projects) - id) * 11)::int)
                """);
        jdbcTemplate.update("""
                UPDATE project_members m
                SET created_at = CASE WHEN m.role = 'OWNER' THEN p.created_at
                                      ELSE LEAST(now() - interval '2 days', p.created_at + make_interval(days => (1 + m.id % 6)::int)) END
                FROM projects p WHERE p.id = m.project_id
                """);
        // Candidatures en attente : arrivées ces derniers jours
        jdbcTemplate.update("""
                UPDATE project_members SET created_at = now() - make_interval(hours => (5 + (id % 9) * 13)::int)
                WHERE status = 'PENDING'
                """);
        jdbcTemplate.update("""
                UPDATE project_members SET created_at = now() - interval '2 days 3 hours'
                WHERE project_id = ? AND user_id = ?
                """, lagosId, amaId);
        jdbcTemplate.update("""
                UPDATE project_openings o
                SET created_at = GREATEST(p.created_at + interval '6 hours',
                                          now() - make_interval(hours => (5 + ((SELECT max(id) FROM project_openings) - o.id) * 9)::int))
                FROM projects p WHERE p.id = o.project_id
                """);
        // Retours : après leur demande, jamais dans le futur
        jdbcTemplate.update("""
                UPDATE feedback f
                SET created_at = LEAST(now() - interval '25 minutes', c.created_at + make_interval(hours => (3 + (f.id % 14) * 9)::int))
                FROM feedback_calls c WHERE c.id = f.call_id
                """);
        // Galeries : ajoutées le lendemain de la création du projet
        jdbcTemplate.update("""
                UPDATE project_media m SET created_at = p.created_at + interval '1 day'
                FROM projects p WHERE p.id = m.project_id
                """);
        // Commentaires et notifications : sur les dernières heures, après leur cible
        jdbcTemplate.update("""
                UPDATE comments SET created_at = now() - make_interval(mins => (10 + ((SELECT max(id) FROM comments) - id) * 41)::int)
                """);
        jdbcTemplate.update("""
                UPDATE notifications SET created_at = now() - make_interval(mins => (2 + ((SELECT max(id) FROM notifications) - id) * 2)::int)
                """);
        for (String table : List.of("projects", "project_members", "project_openings", "project_media", "feedback", "comments",
                "notifications")) {
            jdbcTemplate.update("UPDATE " + table + " SET updated_at = created_at");
        }
    }
}
