package com.hautetech.ndadiee.initializer;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.HackathonMilestoneRequest;
import com.hautetech.ndadiee.dto.request.HackathonPrizeRequest;
import com.hautetech.ndadiee.dto.request.HackathonRequest;
import com.hautetech.ndadiee.dto.request.HackathonResultRequest;
import com.hautetech.ndadiee.dto.request.HackathonTeamRequest;
import com.hautetech.ndadiee.dto.request.MemberDecisionRequest;
import com.hautetech.ndadiee.dto.request.MemberSpecialtyRequest;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.request.ProjectRequest;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;
import com.hautetech.ndadiee.repository.HackathonRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.hackathon.HackathonService;
import com.hautetech.ndadiee.service.project.ProjectOpeningService;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les hackathons de démonstration : un en cours, quatre à venir (dont l'AgriTech 48h d'Abidjan du
 * design 3B, vers J-32), trois terminés avec leur palmarès. Les équipes sont des projets de la vitrine,
 * et trois équipes montées pour l'occasion. Le compte d'essai musa fait partie de l'une d'elles : son
 * atelier montre son prochain hackathon.
 *
 * Les dates sont relatives au jour du démarrage : un week-end (du vendredi 18 h au dimanche 18 h, heure
 * locale) pour les hackathons de 48 heures, et des heures rondes dans le fuseau de chaque événement. Tout
 * passe par les services métier ; un hackathon déjà commencé est d'abord créé dans le futur, le temps
 * d'y inscrire ses équipes, puis ramené à ses vraies dates. Ne s'exécute que si aucun hackathon n'existe,
 * après la vitrine et les comptes d'essai.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HackathonSeeder {

    private static final ZoneId ABIDJAN = ZoneId.of("Africa/Abidjan");
    private static final ZoneId DAKAR = ZoneId.of("Africa/Dakar");
    private static final ZoneId KIGALI = ZoneId.of("Africa/Kigali");
    private static final ZoneId LAGOS = ZoneId.of("Africa/Lagos");
    private static final ZoneId NAIROBI = ZoneId.of("Africa/Nairobi");

    private final DemoAccounts accounts;
    private final HackathonRepository hackathonRepository;
    private final ProjectRepository projectRepository;
    private final HackathonService hackathonService;
    private final ProjectService projectService;
    private final ProjectOpeningService openingService;
    private final SlugService slugService;
    private final JdbcTemplate jdbcTemplate;

    public void seed() {
        if (hackathonRepository.count() > 0) {
            log.info("[Init] Hackathons déjà initialisés, skip.");
            return;
        }
        if (projectRepository.count() == 0) {
            log.info("[Init] Pas de vitrine : hackathons de démonstration non créés.");
            return;
        }
        log.info("[Init] Création des hackathons de démonstration...");

        Long admin = accounts.admin();
        Long awa = accounts.id("awa_diop");
        Long kofi = accounts.id("kofi_mensah");
        Long wanjiru = accounts.id("wanjiru_kamau");
        Long yassine = accounts.id("yassine_elamrani");
        Long aminata = accounts.id("aminata_traore");
        Long jeanPaul = accounts.id("jeanpaul_nkurunziza");
        Long thandiwe = accounts.id("thandiwe_ndlovu");
        Long selam = accounts.id("selam_tesfaye");
        Long chinedu = accounts.id("chinedu_okafor");
        Long ama = accounts.id("ama_owusu");
        Long kwame = accounts.id("kwame_asante");
        Long mameDiarra = accounts.id("mame_diarra_ndiaye");
        Long ibrahima = accounts.id("ibrahima_fall");
        Long emeka = accounts.id("emeka_nwosu");
        Long aissatou = accounts.id("aissatou_sarr");
        Long musa = accounts.id("musa");

        Long lagos = projectId("lagos-transit");
        Long momo = projectId("momo-sdk");
        Long wolof = projectId("wolof-nlp");
        Long agri = projectId("agridata");
        Long edu = projectId("eduoffline");
        Long habesha = projectId("habesha-nlp");
        Long kawral = projectId("kawral");
        Long k8s = projectId("naija-k8s-starter");
        Long solar = projectId("sunu-solar");
        Long sahel = projectId("sahel-ui");

        // ═══════════════════════════════════════════════════════════════
        //  LES ÉQUIPES MONTÉES POUR UN HACKATHON
        // ═══════════════════════════════════════════════════════════════

        Long kumasi = project(kwame, TeamRole.DATA, "Kumasi Builders",
                "Le prix du cacao payé au planteur, affiché en direct dans chaque coopérative.", """
                Une équipe montée pour le hackathon **AgriTech 48h** d'Abidjan : afficher dans chaque coopérative le prix du cacao payé au planteur, et prévenir par SMS quand il change.

                - Relevés des prix bord-champ, saisis par les coopératives
                - Un tableau lisible sur un téléphone d'entrée de gamme
                - Une alerte SMS quand le prix bouge

                Il nous manque un ou une dev front-end pour le tableau des prix.
                """,
                "React", "Python", "PostgreSQL", "Open Data");
        team(kumasi, kwame, chinedu, ProjectRole.MAINTAINER, TeamRole.BACKEND);
        team(kumasi, kwame, ama, ProjectRole.CONTRIBUTOR, TeamRole.BACKEND);
        opening(kwame, kumasi, TeamRole.FRONTEND, "Dev front-end React",
                "Le tableau des prix pour les coopératives, lisible sur un téléphone d'entrée de gamme.", 12,
                "Tableau des prix du cacao");

        Long tontine = project(aminata, TeamRole.FRONTEND, "Tontine Cloud",
                "La tontine du quartier : la caisse partagée, les tours, et un rappel par SMS la veille.", """
                Dans une tontine, chacun cotise et, à tour de rôle, chacun reçoit la caisse. **Tontine Cloud** tient les comptes à la place du cahier : qui a cotisé, à qui le tour, et un rappel par SMS la veille.

                - Cotisations par Wave et Orange Money
                - Un historique que tous les membres peuvent lire
                - Aussi par USSD, sans smartphone

                Nous préparons le hackathon **FinTech Afrique 2026** : il nous manque quelqu'un pour les paiements.
                """,
                "Node.js", "React", "Mobile Money", "USSD");
        team(tontine, aminata, musa, ProjectRole.MAINTAINER, TeamRole.BACKEND);
        team(tontine, aminata, kofi, ProjectRole.CONTRIBUTOR, TeamRole.FRONTEND);
        opening(aminata, tontine, TeamRole.PAYMENTS, "Paiements Wave et Orange Money",
                "Cotiser depuis son téléphone, et reverser la caisse au membre dont c'est le tour.", 7, "Cotiser par Wave");
        opening(aminata, tontine, TeamRole.DESIGN, "Designer UI",
                "L'écran « à qui le tour », compris en un coup d'œil, même par USSD.", 9, "Écran « à qui le tour »");

        Long matatu = project(wanjiru, TeamRole.MOBILE, "Matatu Live",
                "Nairobi's matatu routes, mapped by the people who ride them.", """
                Nairobi runs on **matatus**, yet no map shows their routes. Matatu Live records them with passengers: every trip logged adds to the map, and the GTFS feed it produces is open to everyone.

                - Trips recorded from the phone, even offline
                - A map of routes and informal stops
                - A GTFS feed published every week
                """,
                "Flutter", "Open Data", "GTFS", "OpenStreetMap");
        team(matatu, wanjiru, thandiwe, ProjectRole.MAINTAINER, TeamRole.MOBILE);
        team(matatu, wanjiru, yassine, ProjectRole.CONTRIBUTOR, TeamRole.DEVOPS);
        opening(wanjiru, matatu, TeamRole.DATA, "GTFS mapping",
                "Clean the recorded trips and merge duplicate stops into a valid GTFS feed.", 5, "Merge duplicate stops");

        // ═══════════════════════════════════════════════════════════════
        //  TERMINÉS : LE PALMARÈS
        // ═══════════════════════════════════════════════════════════════

        LocalDate saintLouisKickoff = friday(DAKAR, -396);
        Long saintLouis = organize(admin, new Plan("Saint-Louis Hack 2025",
                "Des services du quotidien qui marchent avec un petit forfait.", """
                Deux jours à Saint-Louis pour construire des services utiles avec un forfait de 500 Mo : se déplacer, apprendre, payer.

                - Équipes de 2 à 5 personnes, sur place
                - Mentors produit et accessibilité pendant tout l'événement
                - Les projets lauréats sont accompagnés pendant six mois
                """,
                "Ndadiee", WorkMode.ONSITE, "SN", "Saint-Louis", DAKAR, at(DAKAR, saintLouisKickoff, 18),
                at(DAKAR, saintLouisKickoff.plusDays(2), 18), at(DAKAR, saintLouisKickoff.minusDays(3), 23), "2 000 000 FCFA", 2, 5, 30,
                List.of("Mobile", "Offline", "Accessibilité"),
                List.of(milestone(at(DAKAR, saintLouisKickoff, 18), "Coup d'envoi"),
                        milestone(at(DAKAR, saintLouisKickoff.plusDays(1), 10), "Mentorat : produit et accessibilité"),
                        milestone(at(DAKAR, saintLouisKickoff.plusDays(2), 14), "Démos devant le jury"),
                        milestone(at(DAKAR, saintLouisKickoff.plusDays(2), 18), "Résultats")),
                List.of(prize("1er prix", "1 000 000 FCFA et six mois d'accompagnement"),
                        prize("2e prix", "600 000 FCFA"),
                        prize("Prix de l'accessibilité", "400 000 FCFA"))),
                enter(kawral, ibrahima, "Réserver sa place dans le sept-places au lieu d'attendre des heures à la gare routière."),
                enter(edu, wanjiru, "Des leçons qu'on télécharge une fois, et qu'on révise partout sans connexion."),
                enter(sahel, kofi, "Des composants React qui restent rapides sur un réseau 2G."));
        result(admin, saintLouis, kawral, 1, null);
        result(admin, saintLouis, edu, 2, null);
        result(admin, saintLouis, sahel, null, "Prix de l'accessibilité");

        LocalDate lagosDataKickoff = friday(LAGOS, -333);
        Long lagosData = organize(admin, new Plan("Lagos Open Data 2025",
                "48 heures pour ouvrir les données de la ville : transports, marchés, services.", """
                Les données de Lagos existent, mais dans des tableurs et des PDF. Pendant 48 heures, les équipes les rendent utilisables : API, cartes, flux ouverts.

                - Équipes de 2 à 5 personnes, sur place et en ligne
                - Jeux de données fournis : arrêts de bus, marchés, centres de santé
                - Chaque projet publie ses données sous licence ouverte
                """,
                "Lagos Open Data Collective", WorkMode.HYBRID, "NG", "Lagos", LAGOS, at(LAGOS, lagosDataKickoff, 17),
                at(LAGOS, lagosDataKickoff.plusDays(2), 17), at(LAGOS, lagosDataKickoff.minusDays(3), 23), "3 000 000 NGN", 2, 5, null,
                List.of("Open Data", "API", "GraphQL"),
                List.of(milestone(at(LAGOS, lagosDataKickoff, 17), "Coup d'envoi, en ligne et à Lagos"),
                        milestone(at(LAGOS, lagosDataKickoff.plusDays(1), 11), "Atelier : publier un flux GTFS"),
                        milestone(at(LAGOS, lagosDataKickoff.plusDays(2), 13), "Démos"),
                        milestone(at(LAGOS, lagosDataKickoff.plusDays(2), 17), "Résultats")),
                List.of(prize("1er prix", "1 500 000 NGN"),
                        prize("2e prix", "900 000 NGN"),
                        prize("3e prix", "600 000 NGN"),
                        prize("Prix du public", "Un an d'hébergement offert"))),
                enter(lagos, chinedu, "Les horaires du BRT en GraphQL, pour toutes les applis de la ville."),
                enter(agri, jeanPaul, "Les prix des marchés en données ouvertes, mis à jour chaque jour."),
                enter(k8s, emeka, "Héberger les données de la ville pour moins de 50 dollars par mois."),
                enter(wolof, mameDiarra, "Un corpus wolof ouvert, annoté par ses locuteurs."));
        result(admin, lagosData, lagos, 1, null);
        result(admin, lagosData, agri, 2, null);
        result(admin, lagosData, k8s, 3, null);
        result(admin, lagosData, wolof, null, "Prix du public");

        LocalDate kigaliKickoff = friday(KIGALI, -61);
        Long kigali = organize(admin, new Plan("FinTech Kigali 2026",
                "Des paiements qui traversent les frontières, sans frais cachés.", """
                Un week-end à Kigali pour simplifier les paiements entre pays voisins : Mobile Money, transferts et commerce en ligne.

                - Équipes de 2 à 4 personnes, sur place
                - Bac à sable des opérateurs Mobile Money fourni
                - Jury de développeurs et de commerçants
                """,
                "Kigali Fintech Circle", WorkMode.ONSITE, "RW", "Kigali", KIGALI, at(KIGALI, kigaliKickoff, 18),
                at(KIGALI, kigaliKickoff.plusDays(2), 18), at(KIGALI, kigaliKickoff.minusDays(3), 23), "USD 8 000", 2, 4, 25,
                List.of("Mobile Money", "API", "Fintech"),
                List.of(milestone(at(KIGALI, kigaliKickoff, 18), "Coup d'envoi"),
                        milestone(at(KIGALI, kigaliKickoff.plusDays(1), 9), "Bac à sable des opérateurs ouvert"),
                        milestone(at(KIGALI, kigaliKickoff.plusDays(2), 14), "Démos devant le jury"),
                        milestone(at(KIGALI, kigaliKickoff.plusDays(2), 18), "Résultats")),
                List.of(prize("1er prix", "USD 5 000"),
                        prize("Prix de l'infrastructure", "USD 3 000 de crédits cloud"))),
                enter(momo, awa, "Un seul SDK pour Orange Money, Wave et MTN MoMo."),
                enter(k8s, emeka, "Un cluster prêt pour les paiements, conforme, pour 50 dollars par mois."));
        result(admin, kigali, momo, 1, null);
        result(admin, kigali, k8s, null, "Prix de l'infrastructure");

        // ═══════════════════════════════════════════════════════════════
        //  EN COURS
        // ═══════════════════════════════════════════════════════════════

        // Commencé hier à 18 h, heure de Lagos : en cours quel que soit le jour du démarrage. Clos à minuit au
        // bout de sept jours : il lui reste au moins une semaine, le temps de relire un déploiement.
        LocalDate mobilityKickoff = LocalDate.now(LAGOS).minusDays(1);
        LocalDate mobilityLastDay = mobilityKickoff.plusDays(8);
        organize(admin, new Plan("Mobilité urbaine",
                "Neuf jours pour améliorer les trajets du quotidien, du danfo au sept-places.", """
                Neuf jours pour améliorer les trajets de tous les jours : **danfo**, **BRT**, **matatu**, **sept-places**, et tous ceux qui les attendent au bord de la route.

                - Équipes de 2 à 5 personnes, en ligne et à Lagos
                - Jeux de données ouverts : horaires, arrêts, temps de trajet relevés sur le terrain
                - Les projets de la vitrine peuvent s'inscrire avec leur équipe
                """,
                "Lagos Open Data Collective", WorkMode.HYBRID, "NG", "Lagos", LAGOS, at(LAGOS, mobilityKickoff, 18),
                at(LAGOS, mobilityLastDay.plusDays(1), 0), at(LAGOS, mobilityKickoff, 18), "4 000 000 NGN", 2, 5, 40,
                List.of("Open Data", "Mobile", "GTFS"),
                List.of(milestone(at(LAGOS, mobilityKickoff, 18), "Coup d'envoi, en ligne et à Lagos"),
                        milestone(at(LAGOS, mobilityKickoff.plusDays(2), 10), "Atelier : données GTFS et OpenStreetMap"),
                        milestone(at(LAGOS, mobilityKickoff.plusDays(5), 15), "Mentorat : produit et accessibilité"),
                        milestone(at(LAGOS, mobilityLastDay, 14), "Démos devant le jury"),
                        milestone(at(LAGOS, mobilityLastDay, 18), "Résultats")),
                List.of(prize("1er prix", "2 000 000 NGN et un an d'hébergement"),
                        prize("2e prix", "1 200 000 NGN"),
                        prize("3e prix", "800 000 NGN"),
                        prize("Prix du public", "Des téléphones de test Android Go"))),
                enter(lagos, chinedu, "Prévenir quand le prochain BRT part, même sans réseau."),
                enter(kawral, ibrahima, "Annoncer le départ du sept-places en temps réel, de Dakar à Saint-Louis."),
                enter(matatu, wanjiru, "Map Nairobi's matatu routes with the people who ride them."));

        // ═══════════════════════════════════════════════════════════════
        //  À VENIR
        // ═══════════════════════════════════════════════════════════════

        LocalDate fintechKickoff = friday(ABIDJAN, 23);
        organize(admin, new Plan("FinTech Afrique 2026",
                "48 heures pour l'inclusion financière : épargne, micro-assurance, paiements entre pays.", """
                48 heures pour imaginer des solutions d'inclusion financière : épargne, micro-assurance, paiements transfrontaliers.

                - Équipes de 2 à 5 personnes, de tous les pays
                - Entièrement en ligne
                - Mentors disponibles pendant tout l'événement

                Les inscriptions se font par équipe. Pas encore d'équipe ? Rejoins un projet de la vitrine qui recrute.
                """,
                "Ndadiee", WorkMode.REMOTE, null, null, ABIDJAN, at(ABIDJAN, fintechKickoff, 17),
                at(ABIDJAN, fintechKickoff.plusDays(2), 17), at(ABIDJAN, fintechKickoff.minusDays(3), 23), "3 000 000 FCFA à partager", 2, 5, 40,
                List.of("Mobile Money", "API", "Fintech"),
                List.of(milestone(at(ABIDJAN, fintechKickoff, 17), "Coup d'envoi en direct"),
                        milestone(at(ABIDJAN, fintechKickoff.plusDays(1), 10), "Mentorat : conformité et sécurité des paiements"),
                        milestone(at(ABIDJAN, fintechKickoff.plusDays(2), 13), "Démos en direct"),
                        milestone(at(ABIDJAN, fintechKickoff.plusDays(2), 17), "Résultats")),
                List.of(prize("1er prix", "1 500 000 FCFA"),
                        prize("2e prix", "900 000 FCFA"),
                        prize("Prix de l'inclusion", "600 000 FCFA"))),
                enter(momo, awa, "Rembourser automatiquement un paiement Wave ou Orange Money annulé."),
                enter(tontine, aminata, "La tontine du quartier en ligne : cotisations, tours et rappels par SMS."));

        // Le vendredi le plus proche de J-32, comme sur le design 3B
        LocalDate agritechKickoff = friday(ABIDJAN, 32);
        organize(admin, new Plan("AgriTech 48h",
                "Du champ au marché : 48 heures pour les filières agricoles.", """
                48 heures à Abidjan pour les filières agricoles : prix payés aux producteurs, météo des parcelles, irrigation, accès au crédit.

                - Équipes de 2 à 5 personnes, sur place
                - Données de marchés et de coopératives mises à disposition
                - Mentors agronomes et développeurs pendant tout l'événement

                Pas encore d'équipe ? Les équipes inscrites cherchent encore des rôles : rejoins-en une.
                """,
                "Abidjan AgriTech Lab", WorkMode.ONSITE, "CI", "Abidjan", ABIDJAN, at(ABIDJAN, agritechKickoff, 18),
                at(ABIDJAN, agritechKickoff.plusDays(2), 18), at(ABIDJAN, agritechKickoff.minusDays(3), 23), "5 000 000 FCFA", 2, 5, 24,
                List.of("Open Data", "IoT", "Mobile"),
                List.of(milestone(at(ABIDJAN, agritechKickoff, 18), "Coup d'envoi et présentation des données"),
                        milestone(at(ABIDJAN, agritechKickoff.plusDays(1), 9), "Visite d'une coopérative de cacao"),
                        milestone(at(ABIDJAN, agritechKickoff.plusDays(1), 15), "Mentorat avec des agronomes"),
                        milestone(at(ABIDJAN, agritechKickoff.plusDays(2), 14), "Démos devant le jury"),
                        milestone(at(ABIDJAN, agritechKickoff.plusDays(2), 18), "Résultats")),
                List.of(prize("1er prix", "2 500 000 FCFA et un an d'incubation"),
                        prize("2e prix", "1 500 000 FCFA"),
                        prize("3e prix", "1 000 000 FCFA"),
                        prize("Prix des coopératives", "Un pilote dans trois coopératives"))),
                enter(kumasi, kwame, "Brancher les relevés des coopératives sur un tableau des prix lisible sur n'importe quel téléphone."),
                enter(agri, jeanPaul, "Le prix du maïs au marché voisin, par SMS, avant de vendre."),
                enter(solar, aissatou, "Piloter les pompes d'irrigation solaires selon l'humidité du sol."));

        // Une semaine, du lundi au samedi
        LocalDate languagesKickoff = friday(DAKAR, 56).plusDays(3);
        organize(admin, new Plan("Langues africaines & IA",
                "Une semaine pour que nos langues aient leur place dans les claviers, les correcteurs et les voix.", """
                Une semaine, à Dakar et en ligne, pour les langues du continent : claviers, correcteurs, synthèse et reconnaissance vocales, traduction.

                - Équipes de 2 à 6 personnes, sur place et en ligne
                - Corpus ouverts en wolof, amharique, haoussa, yoruba et swahili
                - Crédits de calcul pour entraîner les modèles

                Les locuteurs qui relisent et annotent sont aussi précieux que les développeurs.
                """,
                "Dakar Langues & Code", WorkMode.HYBRID, "SN", "Dakar", DAKAR, at(DAKAR, languagesKickoff, 9),
                at(DAKAR, languagesKickoff.plusDays(5), 18), at(DAKAR, languagesKickoff.minusDays(7), 23),
                "3 000 000 FCFA et des crédits de calcul", 2, 6, 30,
                List.of("NLP", "Machine Learning", "Open Source"),
                List.of(milestone(at(DAKAR, languagesKickoff, 9), "Ouverture : présentation des corpus"),
                        milestone(at(DAKAR, languagesKickoff.plusDays(2), 10), "Atelier : annoter sans s'épuiser"),
                        milestone(at(DAKAR, languagesKickoff.plusDays(4), 15), "Revue à mi-parcours"),
                        milestone(at(DAKAR, languagesKickoff.plusDays(5), 14), "Démos"),
                        milestone(at(DAKAR, languagesKickoff.plusDays(5), 18), "Résultats")),
                List.of(prize("1er prix", "1 500 000 FCFA"),
                        prize("2e prix", "1 000 000 FCFA"),
                        prize("Prix des locuteurs", "500 000 FCFA et des crédits de calcul"))),
                enter(wolof, mameDiarra, "Un correcteur orthographique wolof, directement dans le clavier du téléphone."),
                enter(habesha, selam, "Une voix amharique qui lit les SMS à voix haute."));

        // Trois jours, du jeudi au samedi
        LocalDate offGridKickoff = friday(NAIROBI, 95).minusDays(1);
        organize(admin, new Plan("Hors réseau",
                "Énergie et objets connectés pour les villages sans électricité ni 4G.", """
                Trois jours à Nairobi pour l'énergie et les objets connectés là où le réseau ne va pas : mini-réseaux solaires, capteurs, pompes, transmission LoRa.

                - Équipes de 2 à 4 personnes, sur place
                - Cartes ESP32, capteurs et panneaux solaires fournis
                - Tests sur un vrai mini-réseau le dernier jour
                """,
                "Nairobi Hardware Club", WorkMode.ONSITE, "KE", "Nairobi", NAIROBI, at(NAIROBI, offGridKickoff, 9),
                at(NAIROBI, offGridKickoff.plusDays(2), 18), at(NAIROBI, offGridKickoff.minusDays(7), 23), "USD 10 000", 2, 4, 20,
                List.of("IoT", "ESP32", "LoRa"),
                List.of(milestone(at(NAIROBI, offGridKickoff, 9), "Coup d'envoi et distribution du matériel"),
                        milestone(at(NAIROBI, offGridKickoff.plusDays(1), 14), "Atelier : transmettre par LoRa"),
                        milestone(at(NAIROBI, offGridKickoff.plusDays(2), 10), "Tests sur le mini-réseau"),
                        milestone(at(NAIROBI, offGridKickoff.plusDays(2), 18), "Résultats")),
                List.of(prize("1er prix", "USD 6 000"),
                        prize("2e prix", "USD 4 000"))));

        spreadDates(List.of(kumasi, tontine, matatu));
        log.info("[Init] Hackathons créés : {}", hackathonRepository.count());
    }

    // ==================== HACKATHONS ====================

    /** Ce que l'organisation publie : un HackathonRequest, sans le bruit du builder. */
    private record Plan(String title, String tagline, String description, String organizer, WorkMode format,
            String country, String city, ZoneId zone, Instant startsAt, Instant endsAt, Instant registrationClosesAt,
            String prizePool, int minTeamSize, int maxTeamSize, Integer maxTeams, List<String> tags,
            List<HackathonMilestoneRequest> schedule, List<HackathonPrizeRequest> prizes) {
    }

    /** Une équipe à inscrire : le projet, qui l'inscrit, et son pitch. */
    private record Entry(Long projectId, Long registeredBy, String pitch) {
    }

    private static Entry enter(Long projectId, Long registeredBy, String pitch) {
        return new Entry(projectId, registeredBy, pitch);
    }

    /**
     * Publie le hackathon et inscrit ses équipes. Si ses inscriptions sont déjà closes, il est d'abord
     * publié dans le futur, assez loin pour qu'elles soient ouvertes, puis ramené à ses dates.
     */
    private Long organize(Long adminId, Plan plan, Entry... entries) {
        // En jours entiers : les heures rondes de l'affiche le restent
        Instant now = Instant.now();
        Duration shift = plan.registrationClosesAt().isAfter(now)
                ? Duration.ZERO
                : Duration.ofDays(Duration.between(plan.registrationClosesAt(), now).toDays() + 1);

        Long id = hackathonService.create(adminId, HackathonRequest.builder()
                .title(plan.title())
                .tagline(plan.tagline())
                .description(plan.description().strip())
                .organizerName(plan.organizer())
                .format(plan.format())
                .country(plan.country())
                .city(plan.city())
                .timezone(plan.zone().getId())
                .startsAt(plan.startsAt().plus(shift))
                .endsAt(plan.endsAt().plus(shift))
                .registrationClosesAt(plan.registrationClosesAt().plus(shift))
                .prizePool(plan.prizePool())
                .minTeamSize(plan.minTeamSize())
                .maxTeamSize(plan.maxTeamSize())
                .maxTeams(plan.maxTeams())
                .tags(plan.tags())
                .schedule(plan.schedule().stream()
                        .map(item -> milestone(item.getScheduledAt().plus(shift), item.getLabel()))
                        .toList())
                .prizes(plan.prizes())
                .build()).getId();

        for (Entry entry : entries) {
            hackathonService.register(entry.registeredBy(), id, HackathonTeamRequest.builder()
                    .projectId(entry.projectId())
                    .pitch(entry.pitch())
                    .build());
        }
        if (!shift.isZero()) {
            rewind(id, shift);
        }
        return id;
    }

    // Ramène un hackathon publié dans le futur à ses vraies dates : début, fin, clôture et programme
    private void rewind(Long hackathonId, Duration shift) {
        int days = (int) shift.toDays();
        jdbcTemplate.update("""
                UPDATE hackathons
                SET starts_at = starts_at - make_interval(days => ?),
                    ends_at = ends_at - make_interval(days => ?),
                    registration_closes_at = registration_closes_at - make_interval(days => ?)
                WHERE id = ?
                """, days, days, days, hackathonId);
        jdbcTemplate.update("UPDATE hackathon_milestones SET scheduled_at = scheduled_at - make_interval(days => ?) WHERE hackathon_id = ?",
                days, hackathonId);
    }

    private void result(Long adminId, Long hackathonId, Long projectId, Integer rank, String award) {
        hackathonService.setResult(adminId, hackathonId, projectId,
                HackathonResultRequest.builder().rank(rank).award(award).build());
    }

    /**
     * Le vendredi le plus proche de J + days, dans le fuseau de l'événement : un hackathon de 48 heures
     * commence le vendredi soir et finit le dimanche soir.
     */
    private static LocalDate friday(ZoneId zone, int days) {
        LocalDate target = LocalDate.now(zone).plusDays(days);
        int toFriday = DayOfWeek.FRIDAY.getValue() - target.getDayOfWeek().getValue();
        if (toFriday > 3) {
            toFriday -= 7;
        } else if (toFriday < -3) {
            toFriday += 7;
        }
        return target.plusDays(toFriday);
    }

    // Ce jour-là, à l'heure dite, dans le fuseau de l'événement : des horaires ronds, comme sur une affiche
    private static Instant at(ZoneId zone, LocalDate day, int hour) {
        return day.atTime(hour, 0).atZone(zone).toInstant();
    }

    private static HackathonMilestoneRequest milestone(Instant scheduledAt, String label) {
        return HackathonMilestoneRequest.builder().scheduledAt(scheduledAt).label(label).build();
    }

    private static HackathonPrizeRequest prize(String title, String reward) {
        return HackathonPrizeRequest.builder().title(title).reward(reward).build();
    }

    // ==================== ÉQUIPES ====================

    private Long projectId(String slug) {
        return projectRepository.findBySlug(slug)
                .map(Project::getId)
                .orElseThrow(() -> new IllegalStateException("Projet de démonstration introuvable : " + slug));
    }

    // Projet monté pour un hackathon : pas encore de capture, et une équipe qui recrute
    private Long project(Long ownerId, TeamRole ownerSpecialty, String name, String tagline, String description,
            String... tags) {
        String slug = slugService.toSlug(name);
        Long id = projectService.create(ownerId, ProjectRequest.builder()
                .name(name)
                .tagline(tagline)
                .description(description.strip())
                // Dépôts et démos fictifs : example.com est un domaine réservé à la documentation
                .repositoryUrl("https://example.com/ndadiee-demo/" + slug)
                .license("MIT")
                .lookingForContributors(true)
                .tags(List.of(tags))
                .build()).getId();
        projectService.updateMySpecialty(ownerId, id, MemberSpecialtyRequest.builder().specialty(ownerSpecialty).build());
        return id;
    }

    // Demande de contribution acceptée par le porteur
    private void team(Long projectId, Long ownerId, Long developerId, ProjectRole role, TeamRole specialty) {
        Long memberId = projectService.join(developerId, projectId).getId();
        projectService.decide(ownerId, projectId, memberId,
                MemberDecisionRequest.builder().status(MemberStatus.ACCEPTED).role(role).specialty(specialty).build());
    }

    private void opening(Long ownerId, Long projectId, TeamRole role, String title, String description,
            int starterIssueNumber, String starterIssueTitle) {
        openingService.create(ownerId, projectId, ProjectOpeningRequest.builder()
                .role(role)
                .title(title)
                .description(description)
                .seats(1)
                .starterIssueNumber(starterIssueNumber)
                .starterIssueTitle(starterIssueTitle)
                .build());
    }

    // ==================== DATES ====================

    /**
     * Tout vient d'être créé à la même seconde : chaque hackathon est annoncé quarante jours avant la clôture
     * de ses inscriptions (au plus tard avant-hier), ses équipes s'inscrivent ensuite, avant la clôture ; les
     * équipes montées pour l'occasion existent depuis quelques semaines.
     */
    private void spreadDates(List<Long> teamProjects) {
        jdbcTemplate.update("""
                UPDATE hackathons SET created_at = LEAST(now() - interval '2 days', registration_closes_at - interval '40 days')
                """);
        jdbcTemplate.update("""
                UPDATE hackathon_teams t
                SET created_at = GREATEST(h.created_at + interval '1 hour',
                                          LEAST(now() - make_interval(hours => (3 + t.id * 7 % 40)::int),
                                                h.registration_closes_at - make_interval(days => (1 + t.id % 9)::int)))
                FROM hackathons h WHERE h.id = t.hackathon_id
                """);
        for (int index = 0; index < teamProjects.size(); index++) {
            Long projectId = teamProjects.get(index);
            jdbcTemplate.update("UPDATE projects SET created_at = now() - make_interval(days => ?) WHERE id = ?",
                    9 + index * 6, projectId);
            // Le porteur dès la création, les autres membres dans les heures qui suivent
            jdbcTemplate.update("""
                    UPDATE project_members m
                    SET created_at = CASE WHEN m.role = 'OWNER' THEN p.created_at
                                          ELSE p.created_at + make_interval(hours => (2 + m.id % 30)::int) END
                    FROM projects p WHERE p.id = m.project_id AND p.id = ?
                    """, projectId);
            jdbcTemplate.update("UPDATE project_openings SET created_at = now() - make_interval(hours => ?) WHERE project_id = ?",
                    5 + index * 11, projectId);
            for (String table : List.of("project_members", "project_openings")) {
                jdbcTemplate.update("UPDATE " + table + " SET updated_at = created_at WHERE project_id = ?", projectId);
            }
            jdbcTemplate.update("UPDATE projects SET updated_at = created_at WHERE id = ?", projectId);
        }
        for (String table : List.of("hackathons", "hackathon_teams")) {
            jdbcTemplate.update("UPDATE " + table + " SET updated_at = created_at");
        }
    }
}
