package com.hautetech.ndadiee.initializer;

import java.time.LocalDate;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.request.ArticleRequest;
import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.OpportunityRequest;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.OpportunityRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.TagRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.ArticleService;
import com.hautetech.ndadiee.service.content.QuestionService;
import com.hautetech.ndadiee.service.interaction.CommentService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.opportunity.OpportunityService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Données de démonstration pour la présentation : une communauté de développeurs de
 * plusieurs pays africains, avec questions, réponses, articles et opportunités. Les projets
 * de la vitrine et leurs rôles recherchés viennent ensuite (ShowcaseSeeder).
 *
 * Tout le contenu passe par les services métier, comme le ferait l'API : la réputation,
 * les badges et les notifications obtenus sont donc exactement ceux des règles en vigueur.
 * Les comptes sont fictifs (adresses en example.com).
 *
 * Chaque section ne s'exécute que si sa table est vide : une base remplie à moitié (par une
 * version précédente qui s'est arrêtée en route) est complétée au démarrage suivant.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataSeeder {

    private final DemoAccounts accounts;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;
    private final QuestionRepository questionRepository;
    private final ArticleRepository articleRepository;
    private final OpportunityRepository opportunityRepository;
    private final SlugService slugService;
    private final UserService userService;
    private final QuestionService questionService;
    private final AnswerService answerService;
    private final ArticleService articleService;
    private final VoteService voteService;
    private final CommentService commentService;
    private final OpportunityService opportunityService;
    private final JdbcTemplate jdbcTemplate;

    // Les membres de la communauté, retrouvés ou créés au début de seed()
    private Long admin;
    private Long awa;
    private Long kofi;
    private Long chioma;
    private Long wanjiru;
    private Long yassine;
    private Long aminata;
    private Long jeanPaul;
    private Long thandiwe;
    private Long samuel;
    private Long fatou;
    private Long omar;
    private Long selam;

    public void seed() {
        boolean fresh = userRepository.count() == 0;
        boolean missingContent = questionRepository.count() == 0 || articleRepository.count() == 0
                || opportunityRepository.count() == 0;
        if (!fresh && !missingContent) {
            log.info("[Init] Communauté déjà initialisée, skip.");
            return;
        }

        // Une base remplie par une version précédente peut être incomplète : on garde ce qui existe
        // (les comptes sont retrouvés par leur identifiant) et on ajoute seulement ce qui manque.
        log.info(fresh
                ? "[Init] Création des données de démonstration Ndadiee..."
                : "[Init] Données de démonstration incomplètes : ajout des contenus manquants...");

        if (fresh) {
            seedTags();
        }
        admin = accounts.admin();

        // ═══════════════════════════════════════════════════════════════
        //  DÉVELOPPEURS
        // ═══════════════════════════════════════════════════════════════

        awa = developer("awa_diop", "Awa Diop", Role.MODERATOR, "SN", "Dakar", ExperienceLevel.SENIOR, Language.FR, false,
                "Développeuse backend depuis 9 ans. Java, Spring et architecture d'API. Mentor à Dakar, j'aime rendre les sujets compliqués simples.",
                "Java", "Spring Boot", "PostgreSQL", "Docker");
        kofi = developer("kofi_mensah", "Kofi Mensah", Role.USER, "GH", "Accra", ExperienceLevel.MID, Language.EN, false,
                "Frontend engineer in Accra. I build design systems and care a lot about accessibility and performance on low-end phones.",
                "React", "TypeScript", "JavaScript", "CSS");
        chioma = developer("chioma_okafor", "Chioma Okafor", Role.USER, "NG", "Lagos", ExperienceLevel.SENIOR, Language.EN, false,
                "Machine learning engineer in Lagos. Working on speech and text models for Igbo, Yoruba and Hausa.",
                "Python", "Machine Learning", "Django", "PostgreSQL");
        wanjiru = developer("wanjiru_kamau", "Wanjiru Kamau", Role.USER, "KE", "Nairobi", ExperienceLevel.MID, Language.EN, true,
                "Mobile developer in Nairobi. Flutter, offline-first apps and everything that still works when the network does not.",
                "Flutter", "Dart", "Firebase", "Kotlin");
        yassine = developer("yassine_elamrani", "Yassine El Amrani", Role.USER, "MA", "Casablanca", ExperienceLevel.SENIOR, Language.FR, false,
                "Ingénieur DevOps à Casablanca. J'automatise tout ce qui peut l'être et je défends les infrastructures simples et peu coûteuses.",
                "Docker", "Kubernetes", "DevOps", "PostgreSQL", "Linux");
        aminata = developer("aminata_traore", "Aminata Traoré", Role.USER, "CI", "Abidjan", ExperienceLevel.JUNIOR, Language.FR, true,
                "Développeuse full-stack autodidacte à Abidjan. React côté front, Node.js côté back, et beaucoup de curiosité.",
                "React", "Node.js", "JavaScript", "TypeScript");
        jeanPaul = developer("jeanpaul_nkurunziza", "Jean-Paul Nkurunziza", Role.USER, "RW", "Kigali", ExperienceLevel.MID, Language.FR, false,
                "Développeur backend à Kigali. Go et PostgreSQL au quotidien, passionné par les données ouvertes.",
                "Go", "PostgreSQL", "Docker", "Open Data");
        thandiwe = developer("thandiwe_ndlovu", "Thandiwe Ndlovu", Role.USER, "ZA", "Johannesburg", ExperienceLevel.SENIOR, Language.EN, false,
                "Android lead in Johannesburg. Kotlin, Compose, and a decade of shipping apps to millions of users.",
                "Kotlin", "Android", "Java");
        samuel = developer("samuel_ngono", "Samuel Ngono", Role.USER, "CM", "Douala", ExperienceLevel.STUDENT, Language.FR, true,
                "Étudiant en licence d'informatique à Douala. J'apprends Java et Python, et je cherche mon premier stage.",
                "Java", "Python");
        fatou = developer("fatou_sow", "Fatou Sow", Role.USER, "SN", "Thiès", ExperienceLevel.JUNIOR, Language.FR, true,
                "Développeuse mobile junior à Thiès. Flutter le jour, contributions open source le soir.",
                "Flutter", "Dart");
        omar = developer("omar_benali", "Omar Ben Ali", Role.USER, "TN", "Tunis", ExperienceLevel.MID, Language.FR, false,
                "Développeur web à Tunis. Laravel et Vue.js, avec un faible pour les API bien documentées.",
                "PHP", "Laravel", "Vue.js", "JavaScript");
        selam = developer("selam_tesfaye", "Selam Tesfaye", Role.USER, "ET", "Addis-Abeba", ExperienceLevel.MID, Language.EN, false,
                "Data engineer in Addis Ababa. Python, data pipelines, and natural language processing for Amharic.",
                "Python", "Machine Learning", "PostgreSQL");

        if (fresh) {
            // Abonnements et tags suivis : alimentent le fil personnalisé
            follow(samuel, "awa_diop", "chioma_okafor", "yassine_elamrani");
            follow(fatou, "wanjiru_kamau", "awa_diop");
            follow(aminata, "kofi_mensah", "awa_diop", "omar_benali");
            follow(kofi, "aminata_traore", "thandiwe_ndlovu");
            follow(wanjiru, "thandiwe_ndlovu", "fatou_sow");
            follow(jeanPaul, "yassine_elamrani", "awa_diop");
            follow(selam, "chioma_okafor");
            follow(chioma, "selam_tesfaye", "awa_diop");
            follow(omar, "awa_diop");
            followTags(samuel, "java", "spring-boot", "carriere");
            followTags(fatou, "flutter", "offline");
            followTags(aminata, "react", "node-js", "mobile-money");
            followTags(selam, "machine-learning", "python");
        }
        if (questionRepository.count() == 0) {
            seedQuestions();
        }
        if (articleRepository.count() == 0) {
            seedArticles();
        }
        if (opportunityRepository.count() == 0) {
            seedOpportunities();
        }

        spreadDatesOverPastWeeks();

        log.info("[Init] Données de démonstration prêtes : {} utilisateurs", userRepository.count());
        log.info("[Init] Comptes de démonstration : identifiant « awa_diop » (modératrice), « samuel_ngono », « aminata_traore »... et « admin »");
    }

    // ==================== QUESTIONS / RÉPONSES ====================

    private void seedQuestions() {

        Long qComponent = question(samuel, "Spring Boot : quelle différence entre @Component, @Service et @Repository ?", """
                Je débute avec Spring Boot et je vois ces trois annotations partout. Dans mon projet, si je remplace `@Service` par `@Component`, tout continue de fonctionner :

                ```java
                @Component // au lieu de @Service
                public class CommandeService {
                    // ...
                }
                ```

                Alors pourquoi en avoir trois ? Est-ce seulement une convention de nommage ou y a-t-il une vraie différence technique ?
                """, "Java", "Spring Boot");
        Long aComponent = answer(awa, qComponent, """
                Les trois font de ta classe un bean Spring, donc oui : pour l'injection, le résultat est le même. La différence est ailleurs.

                - **`@Component`** : le cas général, un bean sans rôle particulier.
                - **`@Service`** : n'ajoute rien techniquement aujourd'hui. Il dit au lecteur « ici vit la logique métier ».
                - **`@Repository`** : celui-là a un vrai effet. Spring traduit les exceptions de la couche de persistance (`SQLException`, exceptions JPA) en `DataAccessException`, une hiérarchie indépendante de la base utilisée.

                En pratique : `@Repository` pour l'accès aux données, `@Service` pour le métier, `@Component` pour le reste (convertisseurs, écouteurs d'événements...). Tu y gagnes aussi de pouvoir cibler une couche précise avec de l'AOP ou dans les tests.
                """);
        answer(thandiwe, qComponent, """
                Pour compléter : avec Spring Data tu n'écris même pas `@Repository` sur tes interfaces qui étendent `JpaRepository`, l'implémentation générée est déjà enregistrée comme telle.
                """);
        accept(samuel, aComponent);
        upvote(ContentType.QUESTION, qComponent, awa, kofi, aminata, fatou);
        upvote(ContentType.ANSWER, aComponent, samuel, kofi, aminata, fatou, jeanPaul, omar);
        comment(samuel, ContentType.ANSWER, aComponent, "Merci, la traduction des exceptions par @Repository, je ne l'avais lue nulle part.");

        Long qContext = question(kofi, "React : comment éviter les re-rendus inutiles avec useContext ?", """
                J'ai un `AppContext` qui contient l'utilisateur, le thème et le panier. Dès que le panier change, **tous** les composants qui lisent le contexte se re-rendent, même ceux qui n'utilisent que le thème.

                ```jsx
                const { theme } = useContext(AppContext); // re-rendu à chaque ajout au panier
                ```

                Sur des téléphones d'entrée de gamme, ça se sent vraiment. Quelle est la bonne approche sans ajouter une bibliothèque de gestion d'état ?
                """, "React", "JavaScript", "Performance");
        Long aContext = answer(aminata, qContext, """
                Le problème vient du fait qu'un contexte n'a qu'une seule valeur : quand elle change, tous ses consommateurs sont notifiés.

                La solution la plus simple est de **découper** :

                ```jsx
                <ThemeContext.Provider value={theme}>
                  <UserContext.Provider value={user}>
                    <CartContext.Provider value={cart}>
                      {children}
                    </CartContext.Provider>
                  </UserContext.Provider>
                </ThemeContext.Provider>
                ```

                Un composant qui lit `ThemeContext` n'est plus concerné par le panier. Pense aussi à stabiliser les valeurs objets avec `useMemo`, sinon tu crées une nouvelle référence à chaque rendu du provider.
                """);
        answer(thandiwe, qContext, """
                Splitting contexts is the right first step. If one context still changes too often, separate *state* from *dispatch*: put the setter functions in their own context. Components that only trigger updates will never re-render.
                """);
        accept(kofi, aContext);
        upvote(ContentType.QUESTION, qContext, aminata, thandiwe, omar);
        upvote(ContentType.ANSWER, aContext, kofi, thandiwe, omar, awa);

        Long qOffline = question(fatou, "Flutter : comment gérer le mode hors-ligne avec une connexion instable ?", """
                Je développe une application de suivi de stock pour des commerçants. Sur le terrain la connexion coupe sans arrêt, et aujourd'hui l'application affiche juste une erreur réseau.

                Je voudrais que l'utilisateur puisse continuer à saisir ses ventes, et que tout se synchronise au retour du réseau. Par où commencer ? `sqflite`, `Hive`, autre chose ? Et comment éviter les doublons à la synchronisation ?
                """, "Flutter", "Dart", "Offline");
        Long aOffline = answer(wanjiru, qOffline, """
                I shipped exactly this for agents in rural Kenya. The model that worked:

                1. **The local database is the source of truth.** The UI only ever reads and writes locally (I use `drift` on top of SQLite; `Hive` is fine for simple data).
                2. **Every write also goes into an outbox table**: operation type, payload, and a client-generated UUID.
                3. **A sync worker** drains the outbox when connectivity returns (`connectivity_plus` to detect it, `workmanager` to run in the background).
                4. **The server deduplicates on the UUID.** If the same operation arrives twice because the acknowledgement was lost, it is simply ignored.

                Point 4 is what prevents your duplicates: never let the server generate the identifier of something created offline.
                """);
        accept(fatou, aOffline);
        upvote(ContentType.QUESTION, qOffline, wanjiru, awa, aminata, selam, jeanPaul);
        upvote(ContentType.ANSWER, aOffline, fatou, awa, thandiwe, aminata, kofi);
        comment(fatou, ContentType.ANSWER, aOffline, "L'UUID généré côté client, c'était la pièce qui me manquait. Merci !");

        Long qMobileMoney = question(aminata, "Comment intégrer un paiement Mobile Money dans une API Node.js ?", """
                Je dois ajouter le paiement par Mobile Money à une boutique en ligne. J'ai une API Express, et je découvre que chaque opérateur a sa propre API, son propre format de webhook et ses propres délais.

                - Comment structurer le code pour ne pas dupliquer la logique par opérateur ?
                - Comment gérer le cas où le client valide sur son téléphone *après* l'expiration de ma requête ?
                """, "Node.js", "Mobile Money", "API");
        Long aMobileMoney = answer(omar, qMobileMoney, """
                Deux principes qui m'ont évité beaucoup de problèmes :

                **Une interface commune, un adaptateur par opérateur.** Ton code métier ne connaît que `initier(montant, numero)` et `statut(reference)`. Chaque opérateur a sa classe qui traduit.

                **Ne jamais se fier à la réponse HTTP pour conclure.** Un paiement Mobile Money est asynchrone : tu crées une transaction `PENDING` avec ta propre référence, puis tu attends le webhook. Et comme les webhooks se perdent, tu ajoutes une tâche qui interroge le statut des transactions en attente depuis plus de quelques minutes.

                Vérifie aussi la signature du webhook, et rends son traitement idempotent : le même peut arriver deux fois.
                """);
        answer(awa, qMobileMoney, """
                D'accord avec Omar. J'ajoute un point de modélisation : garde une table `transactions` qui ne s'efface jamais, avec l'historique des changements d'état. Le jour où un client conteste un paiement, c'est elle qui te sauve.
                """);
        upvote(ContentType.QUESTION, qMobileMoney, omar, awa, kofi, fatou, samuel, jeanPaul);
        upvote(ContentType.ANSWER, aMobileMoney, aminata, awa, jeanPaul);
        comment(kofi, ContentType.QUESTION, qMobileMoney, "Same problem here in Ghana with three different providers. Following this one.");

        Long qJsonb = question(jeanPaul, "PostgreSQL : quel index pour une colonne JSONB, GIN ou B-tree ?", """
                J'ai une table `evenements` de 40 millions de lignes avec une colonne `donnees JSONB`. La requête suivante prend plusieurs secondes :

                ```sql
                SELECT * FROM evenements WHERE donnees->>'marche' = 'kimironko';
                ```

                J'hésite entre un index GIN sur toute la colonne et un index B-tree sur l'expression. Lequel choisir ?
                """, "PostgreSQL", "Performance");
        Long aJsonb = answer(yassine, qJsonb, """
                Ça dépend de la forme de tes requêtes.

                **Tu filtres toujours sur la même clé** (ton cas) : index B-tree sur l'expression. Il est petit, rapide, et gère aussi les tris et les intervalles.

                ```sql
                CREATE INDEX idx_evenements_marche ON evenements ((donnees->>'marche'));
                ```

                **Tu filtres sur des clés variables** avec l'opérateur `@>` : index GIN, de préférence avec `jsonb_path_ops`, plus compact.

                ```sql
                CREATE INDEX idx_evenements_donnees ON evenements USING GIN (donnees jsonb_path_ops);
                ```

                Attention : un GIN n'aide pas une requête écrite avec `->>`. Il faut la réécrire en `donnees @> '{"marche": "kimironko"}'`. Et sur 40 millions de lignes, crée l'index avec `CONCURRENTLY`.
                """);
        accept(jeanPaul, aJsonb);
        upvote(ContentType.QUESTION, qJsonb, yassine, awa, chioma);
        upvote(ContentType.ANSWER, aJsonb, jeanPaul, awa, chioma, selam);

        Long qDjango = question(chioma, "How do you deploy a Django app on a low-cost VPS with 1 GB of RAM?", """
                Most deployment guides assume a managed platform or a large instance. I need to run a Django API, PostgreSQL and a Celery worker on a single 1 GB VPS, because that is what the budget allows.

                What are the settings that matter most to keep it stable? I keep hitting out-of-memory kills under moderate load.
                """, "Python", "Django", "DevOps");
        Long aDjango = answer(yassine, qDjango, """
                It runs fine on 1 GB if you stop the defaults from over-allocating:

                - **Gunicorn**: 2 workers, not the usual `2 × cores + 1`. Add `--max-requests 500` so workers are recycled before leaks pile up.
                - **PostgreSQL**: `shared_buffers = 128MB`, `work_mem = 4MB`, `max_connections = 20`. The stock values assume a much bigger machine.
                - **Celery**: `--concurrency 1 --max-tasks-per-child 50`.
                - **Swap**: add 1 GB. Slow is better than killed.

                Then put everything behind Nginx and let it serve static files, so Python never does.
                """);
        upvote(ContentType.QUESTION, qDjango, yassine, selam, wanjiru);
        upvote(ContentType.ANSWER, aDjango, chioma, selam, jeanPaul);

        Long qCoroutines = question(thandiwe, "Kotlin coroutines : quand utiliser Dispatchers.IO plutôt que Default ?", """
                Dans les revues de code de mon équipe, on voit `Dispatchers.IO` utilisé un peu partout « par sécurité », y compris pour du calcul. Je voudrais une règle claire à donner aux développeurs juniors. Quelle est la vraie différence entre les deux ?
                """, "Kotlin", "Android");
        Long aCoroutines = answer(wanjiru, qCoroutines, """
                The rule I give juniors: **ask what the thread is doing while it waits.**

                - Waiting on the outside world (network, disk, database): `Dispatchers.IO`. The thread is blocked but idle, so the pool is large.
                - Burning CPU (parsing a big JSON, sorting, image processing): `Dispatchers.Default`. The pool matches the number of cores, because more threads than cores only adds context switching.

                Using `IO` for computation can starve the CPU with dozens of busy threads. And for a suspend function from Room or Retrofit, you need neither: they are already main-safe.
                """);
        accept(thandiwe, aCoroutines);
        upvote(ContentType.ANSWER, aCoroutines, thandiwe, fatou, kofi);
        upvote(ContentType.QUESTION, qCoroutines, wanjiru, fatou);

        Long qOpenSource = question(samuel, "Par où commencer pour contribuer à un projet open source ?", """
                Je suis étudiant et tout le monde me dit que contribuer à l'open source aide à trouver un premier emploi. Mais quand j'ouvre un gros dépôt, je ne comprends pas par où entrer, et j'ai peur de proposer quelque chose de ridicule.

                Comment avez-vous fait votre première contribution ?
                """, "Open Source", "Carrière");
        Long aOpenSource = answer(awa, qOpenSource, """
                Tout le monde a eu cette peur. Quelques conseils concrets :

                1. **Choisis un outil que tu utilises déjà.** Tu connais son comportement, tu sauras reconnaître un bug.
                2. **Commence par la documentation.** Une étape d'installation qui ne marche plus, une faute, un exemple manquant : ces contributions sont utiles et te font découvrir le processus (fork, branche, pull request, revue).
                3. **Cherche les tickets marqués `good first issue`.**
                4. **Annonce-toi avant de coder** : un commentaire « je peux m'en occuper ? » évite le travail en double.

                Et regarde les projets de la vitrine ici : plusieurs cherchent des contributeurs et leurs mainteneurs sont sur la plateforme.
                """);
        answer(chioma, qOpenSource, """
                One more thing: a small project with a responsive maintainer teaches you more than a famous one where your pull request waits for months. Look at how quickly recent pull requests were reviewed before investing your time.
                """);
        upvote(ContentType.QUESTION, qOpenSource, awa, chioma, fatou, aminata, wanjiru);
        upvote(ContentType.ANSWER, aOpenSource, samuel, fatou, aminata, kofi, chioma);

        question(selam, "How to handle Amharic text in PostgreSQL full-text search?", """
                The built-in text search configurations cover languages like English or French, but nothing for Amharic (Ge'ez script). With the `simple` configuration I get exact word matches only, with no stemming, and Amharic has rich morphology.

                Has anyone built a usable search for a language without a built-in configuration? Is trigram search (`pg_trgm`) a reasonable fallback?
                """, "PostgreSQL", "Search", "NLP");

        Long qTenant = question(omar, "Laravel : comment structurer une API multi-tenant ?", """
                Je construis un SaaS de gestion pour des écoles. Chaque école doit voir uniquement ses données. J'hésite entre une base par école et une seule base avec une colonne `ecole_id` partout.

                Nous visons quelques centaines d'écoles. Quelle approche est la plus raisonnable à maintenir pour une petite équipe ?
                """, "Laravel", "PHP", "Architecture");
        answer(awa, qTenant, """
                Pour quelques centaines de clients et une petite équipe : **une seule base, une colonne `ecole_id`**. Une base par client, ce sont des centaines de migrations à jouer et à surveiller à chaque déploiement.

                Le risque de cette approche est d'oublier le filtre dans une requête. Ne le laisse pas à la discipline des développeurs : applique-le automatiquement avec un *global scope* Eloquent, et ajoute un test qui vérifie qu'une école ne peut pas lire les données d'une autre.
                """);
        upvote(ContentType.QUESTION, qTenant, awa, jeanPaul);
    }

    // ==================== ARTICLES ====================

    private void seedArticles() {

        Long artApi = article(awa, Language.FR, true, "Construire une API REST qui vieillit bien avec Spring Boot", """
                Une API est facile à écrire et difficile à faire évoluer. Voici les décisions que je prends dès le premier jour sur un projet Spring Boot, parce qu'elles coûtent cher à corriger plus tard.

                ## 1. Ne jamais exposer ses entités

                Renvoyer directement une entité JPA depuis un contrôleur lie ton contrat d'API à ton schéma de base. Le jour où tu renommes une colonne, tu casses tes clients. Un DTO par réponse, toujours.

                ## 2. Un seul format d'erreur

                Le front ne doit pas deviner la forme d'une erreur. Un `@RestControllerAdvice` qui renvoie toujours le même objet :

                ```json
                { "status": 404, "errorCode": "RESOURCE_NOT_FOUND", "message": "Question introuvable" }
                ```

                ## 3. Le schéma appartient aux migrations

                `ddl-auto: update` est pratique une semaine. Ensuite, utilise Flyway et passe Hibernate en `validate` : chaque changement de schéma est relu, versionné et rejouable.

                ## 4. Paginer dès le début

                Une liste non paginée fonctionne avec 50 lignes et tombe avec 50 000. Ajouter la pagination après coup casse tous les clients.

                Rien de spectaculaire ici, et c'est le but : une API ennuyeuse est une API qu'on peut maintenir.
                """, "Java", "Spring Boot", "API");
        Long artVps = article(yassine, Language.FR, true, "Déployer sans se ruiner : Docker Compose sur un VPS à 5 dollars", """
                On associe souvent « mise en production » à Kubernetes et à des factures en centaines de dollars. Pour la grande majorité des projets, un seul serveur suffit pendant des années.

                ## L'architecture

                Un VPS, Docker Compose, et trois services : l'application, PostgreSQL, et un reverse proxy qui gère le HTTPS.

                ```yaml
                services:
                  app:
                    image: monapp:1.4.2
                    restart: unless-stopped
                  postgres:
                    image: postgres:17
                    volumes:
                      - pgdata:/var/lib/postgresql/data
                ```

                ## Ce qu'il ne faut pas négliger

                - **Les sauvegardes.** Un `pg_dump` chiffré, envoyé chaque nuit hors du serveur. Et testé : une sauvegarde jamais restaurée n'est qu'un espoir.
                - **Les ports.** La base ne doit écouter que sur `127.0.0.1`.
                - **Les mises à jour de sécurité** automatiques du système.

                ## Quand passer à autre chose

                Quand tu as besoin de zéro interruption pendant les déploiements, ou de plus d'une machine. Pas avant. La complexité a un coût, et il se paie en heures d'astreinte.
                """, "Docker", "DevOps", "Linux");
        Long artMl = article(chioma, Language.EN, true, "Building language models that actually work for African languages", """
                Most language models are trained on text that is overwhelmingly English. When we evaluate them on Igbo or Yoruba, the results look fine in a demo and fall apart on real user input.

                ## The data problem is not what you think

                The issue is rarely the *amount* of text. It is the *kind*. Available corpora are mostly religious texts and news, while users write informally, mix languages in the same sentence, and often drop tonal marks.

                ## What worked for us

                1. **Collect data where people actually write.** We partnered with community radio stations to transcribe call-in shows.
                2. **Treat code-switching as normal**, not as noise to clean.
                3. **Evaluate with native speakers.** Automatic metrics rewarded outputs that speakers found unnatural.

                ## Start small

                A fine-tuned small model with good data beat a much larger general model in every one of our tests. If you work on a low-resource language, your time is better spent on data than on architecture.
                """, "Python", "Machine Learning", "NLP");
        Long artOffline = article(wanjiru, Language.EN, true, "Offline-first mobile apps: lessons from building for rural Kenya", """
                Our first version assumed the network was there and treated its absence as an error. In the field, the network was absent most of the day. We rebuilt the app around the opposite assumption.

                ## Lesson 1: the local database is the truth

                Screens never wait for the server. They read from and write to local storage, and synchronisation happens in the background.

                ## Lesson 2: make every operation safe to repeat

                Requests time out after the server has processed them. If retrying creates a duplicate, you will get duplicates. Generate identifiers on the device and let the server ignore what it has already seen.

                ## Lesson 3: show the sync state honestly

                Users forgave slow synchronisation. They did not forgive data that silently failed to upload. A small "3 items waiting to sync" indicator built more trust than any speed improvement.

                ## Lesson 4: measure data usage

                Mobile data is expensive relative to income. We cut payload sizes by 80% by sending only changed fields, and it was the most appreciated update we ever shipped.
                """, "Flutter", "Offline", "Mobile");
        Long artParcours = article(aminata, Language.FR, true, "De l'autoformation à mon premier poste de développeuse à Abidjan", """
                Il y a deux ans, je vendais des forfaits téléphoniques. Aujourd'hui je suis développeuse dans une startup d'Abidjan. Je n'ai pas de diplôme en informatique, et je veux raconter ce qui a vraiment compté.

                ## Ce qui a fonctionné

                **Construire des choses dont quelqu'un a besoin.** Mon premier vrai projet était un outil de gestion de stock pour la boutique de ma tante. Il était laid, mais il était utilisé, et j'ai appris plus en corrigeant ses bugs qu'en suivant dix tutoriels.

                **Poser des questions en public.** J'avais honte de mes questions. J'ai fini par comprendre que les développeurs expérimentés respectent une question bien posée, quel que soit son niveau.

                **Montrer son travail.** C'est un projet publié, pas mon CV, qui m'a valu mon premier entretien.

                ## Ce que je ferais différemment

                J'ai passé six mois à changer de langage toutes les trois semaines. Choisissez-en un, et restez-y jusqu'à avoir terminé quelque chose.

                Si vous débutez et que vous lisez ceci : votre parcours n'a pas besoin de ressembler à celui des autres.
                """, "Carrière");
        article(awa, Language.FR, false, "Sécuriser une API avec JWT : les erreurs que je vois le plus souvent", """
                Brouillon en cours de rédaction.

                Plan prévu : durée de vie des jetons, stockage côté navigateur, rotation des refresh tokens, et pourquoi la clé de signature ne doit jamais se trouver dans le dépôt.
                """, "Java", "Sécurité");
        upvote(ContentType.ARTICLE, artApi, samuel, kofi, aminata, jeanPaul, omar, fatou, chioma);
        upvote(ContentType.ARTICLE, artVps, awa, chioma, jeanPaul, omar, samuel);
        upvote(ContentType.ARTICLE, artMl, selam, awa, wanjiru, kofi);
        upvote(ContentType.ARTICLE, artOffline, fatou, awa, aminata, thandiwe, kofi, selam);
        upvote(ContentType.ARTICLE, artParcours, samuel, fatou, awa, kofi, wanjiru, chioma, omar, selam);
        comment(samuel, ContentType.ARTICLE, artParcours, "Je me reconnais tellement dans les six mois à changer de langage. Merci pour ce témoignage.");
        comment(selam, ContentType.ARTICLE, artMl, "We see the same thing with Amharic. Would love to compare notes on data collection.");
        comment(jeanPaul, ContentType.ARTICLE, artVps, "Le point sur les sauvegardes testées devrait être affiché dans tous les bureaux.");
    }

    // ==================== OPPORTUNITÉS ====================

    private void seedOpportunities() {

        opportunity(awa, OpportunityType.JOB, WorkMode.HYBRID, "Développeur·se backend Java / Spring Boot", "Teranga Tech", "SN", "Dakar",
                "800 000 – 1 200 000 FCFA / mois", 30, """
                Teranga Tech conçoit des logiciels de gestion pour les PME d'Afrique de l'Ouest.

                **Vos missions**
                - Concevoir et faire évoluer nos API REST
                - Participer aux revues de code et à l'amélioration de la qualité
                - Accompagner les développeurs juniors

                **Profil** : 3 ans d'expérience en Java, bonne maîtrise de Spring Boot et de PostgreSQL. Deux jours par semaine au bureau de Dakar.
                """, "Java", "Spring Boot", "PostgreSQL");
        opportunity(aminata, OpportunityType.FREELANCE, WorkMode.REMOTE, "Mission freelance : application mobile de livraison", "Lagune Digital", "CI", "Abidjan",
                "Selon profil, mission de 3 mois", 21, """
                Nous cherchons un·e développeur·se mobile pour finaliser une application de livraison de repas : suivi de commande en temps réel, paiement Mobile Money et notifications.

                Le backend existe déjà. Mission à distance, avec un point hebdomadaire.
                """, "Flutter", "Mobile Money");
        opportunity(chioma, OpportunityType.INTERNSHIP, WorkMode.ONSITE, "Data science internship (6 months)", "Lagos Language Lab", "NG", "Lagos",
                "Paid internship", 45, """
                Join a small research team building speech and text datasets for Nigerian languages.

                You will help collect and clean data, run evaluation experiments, and write up results. A good grasp of Python is required; speaking Yoruba, Igbo or Hausa is a strong plus.

                Open to final-year students and recent graduates.
                """, "Python", "Machine Learning");
        opportunity(yassine, OpportunityType.JOB, WorkMode.REMOTE, "Ingénieur·e DevOps senior", "Atlas Cloud", "MA", "Casablanca",
                "25 000 – 35 000 MAD / mois", 40, """
                Atlas Cloud héberge les applications de plus de 200 entreprises au Maghreb.

                Vous rejoignez l'équipe plateforme pour fiabiliser nos déploiements, améliorer notre supervision et réduire nos coûts d'infrastructure. Poste ouvert au télétravail complet depuis le Maroc, la Tunisie ou le Sénégal.
                """, "DevOps", "Kubernetes", "Docker");
        opportunity(thandiwe, OpportunityType.JOB, WorkMode.HYBRID, "Android engineer (Kotlin)", "Jozi Mobile", "ZA", "Johannesburg",
                "R 55 000 – R 75 000 per month", 25, """
                We build the mobile banking app used by two million customers across Southern Africa.

                You will work on a modern Kotlin and Compose codebase, with a strong testing culture and weekly releases. Three days a week in our Johannesburg office.
                """, "Kotlin", "Android");
        opportunity(wanjiru, OpportunityType.FREELANCE, WorkMode.REMOTE, "Flutter developer for an education app", "Elimu Labs", "KE", "Nairobi",
                "USD 25 – 35 per hour", 15, """
                Short contract to add offline lesson downloads to an existing Flutter app used by secondary schools. Experience with local databases and background synchronisation is essential.
                """, "Flutter", "Dart", "Offline");
    }

    // ==================== COMPTES ====================

    private void seedTags() {
        tag("Java", "Langage orienté objet, très présent dans les systèmes d'entreprise et le backend.");
        tag("Spring Boot", "Framework Java pour construire rapidement des applications et des API prêtes pour la production.");
        tag("Python", "Langage polyvalent : web, scripts, science des données et apprentissage automatique.");
        tag("JavaScript", "Le langage du navigateur, aujourd'hui aussi côté serveur avec Node.js.");
        tag("TypeScript", "JavaScript avec un système de types statiques.");
        tag("React", "Bibliothèque JavaScript pour construire des interfaces à base de composants.");
        tag("Node.js", "Environnement d'exécution JavaScript côté serveur.");
        tag("Flutter", "Framework de Google pour créer des applications mobiles, web et bureau avec un seul code.");
        tag("Dart", "Le langage de Flutter.");
        tag("Kotlin", "Langage moderne de la JVM, langage officiel du développement Android.");
        tag("Android", "Développement d'applications pour le système Android.");
        tag("PostgreSQL", "Base de données relationnelle open source.");
        tag("Docker", "Empaqueter et exécuter des applications dans des conteneurs.");
        tag("DevOps", "Pratiques et outils qui rapprochent développement et exploitation.");
        tag("Mobile Money", "Paiement et transfert d'argent par téléphone mobile.");
        tag("Machine Learning", "Apprentissage automatique : modèles entraînés à partir de données.");
        tag("Open Source", "Logiciels dont le code est public et auquel chacun peut contribuer.");
        tag("Carrière", "Parcours, recrutement, premier emploi, évolution professionnelle.");
        tag("Offline", "Applications qui fonctionnent sans connexion ou avec une connexion instable.");
        tag("Performance", "Optimisation de la vitesse et de la consommation de ressources.");
    }

    private void tag(String name, String description) {
        tagRepository.save(Tag.builder()
                .name(name)
                .slug(slugService.toSlug(name))
                .description(description)
                .build());
    }

    // Retrouvé s'il existe déjà, sinon créé avec son profil (DemoAccounts)
    private Long developer(String username, String fullName, Role role, String country, String city,
            ExperienceLevel level, Language language, boolean openToWork, String bio, String... skills) {
        return accounts.developer(username, fullName, role, country, city, level, language, openToWork, bio, skills);
    }

    private void follow(Long followerId, String... usernames) {
        for (String username : usernames) {
            userService.follow(followerId, username);
        }
    }

    private void followTags(Long developerId, String... tagSlugs) {
        for (String tagSlug : tagSlugs) {
            userService.followTag(developerId, tagSlug);
        }
    }

    // ==================== CONTENU ====================

    private Long question(Long authorId, String title, String body, String... tags) {
        return questionService.create(authorId, QuestionRequest.builder()
                .title(title)
                .body(body.strip())
                .tags(List.of(tags))
                .build()).getId();
    }

    private Long answer(Long authorId, Long questionId, String body) {
        return answerService.create(authorId, questionId, AnswerRequest.builder().body(body.strip()).build()).getId();
    }

    private void accept(Long questionAuthorId, Long answerId) {
        answerService.accept(questionAuthorId, answerId);
    }

    private Long article(Long authorId, Language language, boolean publish, String title, String content, String... tags) {
        return articleService.create(authorId, ArticleRequest.builder()
                .title(title)
                .content(content.strip())
                .language(language)
                .publish(publish)
                .tags(List.of(tags))
                .build()).getId();
    }

    private void opportunity(Long postedById, OpportunityType type, WorkMode workMode, String title, String companyName,
            String country, String city, String salaryRange, int deadlineInDays, String description, String... tags) {
        opportunityService.create(postedById, OpportunityRequest.builder()
                .title(title)
                .description(description.strip())
                .companyName(companyName)
                .type(type)
                .workMode(workMode)
                .country(country)
                .city(city)
                .salaryRange(salaryRange)
                // Pas de lien de candidature : une offre de démonstration n'existe nulle part ailleurs, on écrit à son auteur
                .deadline(LocalDate.now().plusDays(deadlineInDays))
                .tags(List.of(tags))
                .build());
    }

    // ==================== INTERACTIONS ====================

    private void upvote(ContentType targetType, Long targetId, Long... voterIds) {
        for (Long voterId : voterIds) {
            voteService.vote(voterId, VoteRequest.builder().targetType(targetType).targetId(targetId).value(1).build());
        }
    }

    private void comment(Long authorId, ContentType targetType, Long targetId, String body) {
        commentService.create(authorId, CommentRequest.builder()
                .targetType(targetType)
                .targetId(targetId)
                .body(body)
                .build());
    }

    // ==================== DATES ====================

    /**
     * Tout vient d'être créé à la même seconde. Pour que la démonstration ressemble à une
     * communauté vivante (« il y a 3 jours », « il y a 2 semaines »), on étale les dates
     * dans le passé, en gardant l'ordre de création et en plaçant les réponses après leur question.
     */
    private void spreadDatesOverPastWeeks() {
        jdbcTemplate.update("""
                UPDATE users SET created_at = now() - make_interval(days => (30 + ((SELECT max(id) FROM users) - id) * 17)::int)
                """);
        jdbcTemplate.update("""
                UPDATE questions SET created_at = now() - make_interval(hours => (5 + ((SELECT max(id) FROM questions) - id) * 31)::int)
                """);
        jdbcTemplate.update("""
                UPDATE answers a
                SET created_at = LEAST(now() - interval '20 minutes',
                                       q.created_at + make_interval(mins => (35 + (a.id % 5) * 50)::int))
                FROM questions q WHERE q.id = a.question_id
                """);
        jdbcTemplate.update("""
                UPDATE articles SET created_at = now() - make_interval(hours => (9 + ((SELECT max(id) FROM articles) - id) * 53)::int)
                """);
        jdbcTemplate.update("UPDATE articles SET published_at = created_at WHERE published_at IS NOT NULL");
        jdbcTemplate.update("""
                UPDATE opportunities SET created_at = now() - make_interval(hours => (7 + ((SELECT max(id) FROM opportunities) - id) * 22)::int)
                """);
        // Commentaires et notifications : étalés sur les dernières heures, donc après leur cible
        jdbcTemplate.update("""
                UPDATE comments SET created_at = now() - make_interval(mins => (10 + ((SELECT max(id) FROM comments) - id) * 41)::int)
                """);
        jdbcTemplate.update("""
                UPDATE notifications SET created_at = now() - make_interval(mins => (2 + ((SELECT max(id) FROM notifications) - id) * 2)::int)
                """);
        for (String table : List.of("users", "questions", "answers", "articles", "opportunities",
                "comments", "notifications")) {
            jdbcTemplate.update("UPDATE " + table + " SET updated_at = created_at");
        }
    }
}
