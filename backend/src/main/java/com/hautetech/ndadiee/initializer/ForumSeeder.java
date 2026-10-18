package com.hautetech.ndadiee.initializer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.request.CommentRequest;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;
import com.hautetech.ndadiee.service.interaction.BookmarkService;
import com.hautetech.ndadiee.service.interaction.CommentService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le forum de la démonstration, après les premières questions de la communauté (DemoDataSeeder) : des sujets de
 * tous les jours, publiés sur trois semaines, avec des discussions sous les réponses, des sujets encore sans
 * réponse, et les deux comptes d'essai qui y participent.
 *
 * <ul>
 * <li>Ada a posé une question qui attend qu'elle accepte une réponse, Musa a résolu celle de Yassine : de quoi
 * essayer l'acceptation et voir sa réputation bouger.</li>
 * <li>Tous deux suivent des tags (leur fil, « Mon fil ») et ont déjà enregistré des sujets (leur liste de
 * lecture).</li>
 * </ul>
 *
 * Tout passe par les services métier, comme le ferait l'API : votes, réputation, badges et notifications sont
 * ceux des règles en vigueur. Créé une seule fois : si le premier sujet existe déjà, rien n'est refait.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ForumSeeder {

    // Le premier sujet de cette section : s'il existe, le forum a déjà été rempli
    private static final String MARKER_TITLE = "React Query: how do I update a list after a mutation without refetching everything?";

    private final DemoAccounts accounts;
    private final QuestionRepository questionRepository;
    private final SlugService slugService;
    private final QuestionService questionService;
    private final AnswerService answerService;
    private final CommentService commentService;
    private final VoteService voteService;
    private final BookmarkService bookmarkService;
    private final UserService userService;
    private final JdbcTemplate jdbcTemplate;

    // Chaque sujet et son âge, en heures : les dates sont posées à la fin
    private final Map<Long, Integer> ages = new LinkedHashMap<>();

    public void seed() {
        if (questionRepository.existsBySlug(slugService.toSlug(MARKER_TITLE))) {
            log.info("[Init] Forum déjà initialisé, skip.");
            return;
        }
        log.info("[Init] Création des sujets du forum...");

        Long ada = accounts.id("ada");
        Long musa = accounts.id("musa");
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

        // ── Ada attend une réponse à accepter ──
        Long qCache = question(ada, 3, MARKER_TITLE, """
                I have a list of tasks loaded with `useQuery(['tasks'])`. When I create a task with `useMutation`, I call `invalidateQueries` and the whole list is downloaded again.

                ```tsx
                const create = useMutation({
                  mutationFn: api.createTask,
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                });
                ```

                On a slow 3G connection it takes two or three seconds before the new task appears. Is there a way to show it right away, and only fix things if the server disagrees?
                """, "React", "TypeScript", "Performance");
        Long aCacheKofi = answer(kofi, qCache, """
                Yes: write the server's answer straight into the cache instead of refetching.

                ```tsx
                onSuccess: (task) => {
                  queryClient.setQueryData<Task[]>(['tasks'], (tasks = []) => [task, ...tasks]);
                },
                ```

                The list updates as soon as the request returns, with no second download. If you want it **before** the server answers, that is an optimistic update: do the same in `onMutate`, keep the previous value, and put it back in `onError`.
                """);
        answer(aminata, qCache, """
                Petite précision : garde quand même un `invalidateQueries` dans `onSettled` si d'autres écrans calculent des choses à partir de la liste (compteurs, tris côté serveur). Il se fait en arrière-plan, l'utilisateur ne l'attend plus.
                """);
        comment(ada, ContentType.ANSWER, aCacheKofi, "Does this also work with `useInfiniteQuery`? My list is paginated.");
        comment(kofi, ContentType.ANSWER, aCacheKofi, "It does, the shape is just different: map over `data.pages` and add the task to the first page.");
        upvote(ContentType.QUESTION, qCache, kofi, aminata, thandiwe);
        upvote(ContentType.ANSWER, aCacheKofi, ada, aminata, chioma, wanjiru);

        // ── Le dernier sujet de Jean-Paul : tout frais, sans réponse ──
        question(jeanPaul, 1, "Go : comment structurer un petit service HTTP sans framework ?", """
                Je dois écrire un petit service qui expose trois routes et lit une base PostgreSQL. Tout le monde me conseille un framework différent (Gin, Echo, Fiber...), alors que la bibliothèque standard semble suffire depuis Go 1.22 et ses routes avec méthode et paramètres :

                ```go
                mux := http.NewServeMux()
                mux.HandleFunc("GET /marches/{id}", s.getMarche)
                ```

                Comment organiser les fichiers et les dépendances (base, configuration, logs) pour que ça reste lisible quand le service grandit ?
                """, "Go", "Architecture");

        // ── Omar : une question récente, encore sans réponse ──
        question(omar, 5, "Vue 3 : Pinia ou de simples composables pour l'état partagé ?", """
                Sur une petite application Vue 3, j'ai un panier et un utilisateur connecté à partager entre plusieurs pages. Un composable avec un `ref` déclaré hors de la fonction fait le travail :

                ```js
                const panier = ref([])
                export function usePanier() {
                  return { panier, ajouter: (article) => panier.value.push(article) }
                }
                ```

                Est-ce que Pinia apporte vraiment quelque chose à cette échelle (devtools, SSR, tests) ou est-ce de la complexité en plus ?
                """, "Vue.js", "JavaScript");

        // ── USSD : une réponse, pas encore acceptée ──
        Long qUssd = question(fatou, 8, "USSD : comment tester un menu sans passer par l'opérateur ?", """
                Je développe un menu USSD pour que des commerçants consultent leur solde sans smartphone. Pour tester, je dois à chaque fois composer le code sur un vrai téléphone, et chaque session coûte du temps et de l'argent.

                Comment tester les enchaînements de menus en local ? Et comment écrire des tests automatiques pour ce genre de flux ?
                """, "USSD", "Node.js", "Mobile Money");
        Long aUssdOmar = answer(omar, qUssd, """
                Deux niveaux de test, comme pour n'importe quelle API :

                1. **En local**, la plupart des agrégateurs ont un bac à sable avec un simulateur de téléphone dans le navigateur. Ton serveur reçoit exactement la même requête HTTP qu'en production (session, numéro, texte saisi). Expose ton serveur local avec un tunnel et pointe le simulateur dessus.
                2. **En tests automatiques**, sépare le menu du transport. Ton menu est une machine à états : `(état, saisie) -> (nouvel état, texte à afficher)`. Une fonction pure, qui se teste sans réseau :

                ```js
                expect(menu('ACCUEIL', '1')).toEqual({ etat: 'SOLDE', texte: 'CON Votre solde : 12 500 FCFA\\n0. Retour' })
                ```

                Le contrôleur HTTP ne fait plus que traduire la requête de l'opérateur.
                """);
        answer(aminata, qUssd, """
                Pense aussi au délai : une session USSD expire vite (souvent moins de 3 minutes, et parfois 20 secondes entre deux écrans). Ajoute un test qui vérifie qu'une étape lente (appel à ta base, à l'API de paiement) ne fait pas tomber la session.
                """);
        comment(fatou, ContentType.ANSWER, aUssdOmar, "La machine à états en fonction pure, c'est exactement ce qui me manquait. Mes tests passent sans téléphone maintenant.");
        upvote(ContentType.QUESTION, qUssd, omar, aminata, wanjiru, awa);
        upvote(ContentType.ANSWER, aUssdOmar, fatou, aminata, awa, jeanPaul);

        // ── Samuel prépare son premier entretien : une vraie discussion ──
        Long qInterview = question(samuel, 14, "Premier entretien technique dans deux semaines : comment me préparer ?", """
                J'ai décroché un premier entretien pour un stage de développeur backend (Java). Il y aura un exercice de code en direct et des questions sur un projet personnel.

                Je ne sais pas où mettre mon énergie : refaire des exercices d'algorithmique, réviser Spring, préparer la présentation de mon projet ? Comment vous êtes-vous préparés pour votre premier entretien ?
                """, "Carrière", "Java");
        Long aInterviewMusa = answer(musa, qInterview, """
                Je fais passer des entretiens à Dakar. Ce que je regarde vraiment, dans l'ordre :

                1. **Comment tu réfléchis à voix haute.** Un candidat qui dit « je vois deux approches, je commence par la plus simple » marque des points, même s'il ne finit pas.
                2. **Ton projet.** Sois prêt à expliquer un choix que tu regrettes et ce que tu ferais autrement. C'est la question qui sépare ceux qui ont construit de ceux qui ont copié.
                3. **Les bases**, pas les détails de Spring : une requête SQL avec une jointure, ce qu'est une transaction, la différence entre une liste et un ensemble.

                Pour deux semaines : 30 minutes d'exercices par jour à voix haute, et le reste sur la présentation de ton projet.
                """);
        answer(awa, qInterview, """
                J'ajoute : prépare deux ou trois questions pour eux. Comment se passent les revues de code ? Qui m'accompagnerait les premières semaines ? Un candidat qui pose ces questions montre qu'il se projette dans l'équipe.
                """);
        answer(kofi, qInterview, """
                Practice the live-coding part with a friend watching you, or record yourself. Coding alone in silence and coding while someone watches are two very different skills. The second one gets easier quickly with a bit of practice.
                """);
        comment(samuel, ContentType.ANSWER, aInterviewMusa, "« Un choix que tu regrettes » : je n'y avais pas pensé du tout. Je prépare ça ce soir, merci !");
        comment(musa, ContentType.ANSWER, aInterviewMusa, "Avec plaisir. Reviens nous dire comment ça s'est passé.");
        upvote(ContentType.QUESTION, qInterview, awa, musa, kofi, fatou, aminata, chioma, wanjiru);
        upvote(ContentType.ANSWER, aInterviewMusa, samuel, awa, fatou, aminata, kofi, thandiwe, jeanPaul);

        // ── Musa : sa pagination, résolue par Jean-Paul ──
        Long qPaging = question(musa, 20, "Spring Data : des lignes en double d'une page à l'autre quand plusieurs ont la même date", """
                Ma liste d'annonces est triée par date de création, page par page :

                ```java
                repository.findAll(spec, PageRequest.of(page, 20, Sort.by(DESC, "createdAt")));
                ```

                Des annonces importées en lot ont exactement la même date. Résultat : en passant de la page 1 à la page 2, certaines apparaissent deux fois et d'autres jamais. Comment rendre la pagination stable ?
                """, "Java", "Spring Boot", "PostgreSQL");
        Long aPagingJeanPaul = answer(jeanPaul, qPaging, """
                PostgreSQL ne garantit aucun ordre entre des lignes égales sur la clé de tri : deux requêtes peuvent les rendre dans un ordre différent. Il faut un **ordre total**, en ajoutant une colonne unique en dernier critère :

                ```java
                Sort.by(DESC, "createdAt").and(Sort.by(DESC, "id"))
                ```

                Chaque ligne a alors une place unique, la même à chaque requête.
                """);
        answer(awa, qPaging, """
                Et si la table devient grosse, regarde la pagination par curseur (*keyset*) : au lieu de `OFFSET 4000`, tu demandes « les 20 suivantes après (date, id) de la dernière vue ». Plus rapide, et insensible aux lignes ajoutées pendant qu'on lit.
                """);
        accept(musa, aPagingJeanPaul);
        comment(musa, ContentType.ANSWER, aPagingJeanPaul, "Simple et efficace. Je l'ai mis dans un utilitaire pour toutes les listes paginées.");
        upvote(ContentType.QUESTION, qPaging, jeanPaul, awa, yassine);
        upvote(ContentType.ANSWER, aPagingJeanPaul, musa, awa, yassine, samuel);

        // ── TypeScript : deux avis, pas de solution unique ──
        Long qTypes = question(aminata, 30, "TypeScript : `type` ou `interface` pour les props d'un composant React ?", """
                Dans mon équipe, la moitié écrit `type Props = { ... }` et l'autre `interface Props { ... }`. Les deux marchent. Y a-t-il une vraie différence, ou faut-il juste choisir une convention et s'y tenir ?
                """, "TypeScript", "React");
        answer(kofi, qTypes, """
                For props, the practical differences are small:

                - `interface` can be **extended and merged**: two declarations with the same name combine. Useful for public library types, surprising in application code.
                - `type` can express **unions and mapped types**: `type Props = A | B` is impossible with an interface.

                Since component props often end up as unions (a button that is either a link or a button), many teams default to `type` and only use `interface` for objects meant to be extended.
                """);
        Long aTypesAda = answer(ada, qTypes, """
                Whatever you pick, enforce it with a lint rule (`@typescript-eslint/consistent-type-definitions`). The worst outcome is not choosing the "wrong" one, it is every review turning into the same debate.
                """);
        comment(aminata, ContentType.ANSWER, aTypesAda, "La règle de lint, c'est la vraie réponse pour l'équipe. Adoptée !");
        upvote(ContentType.QUESTION, qTypes, kofi, ada, omar);
        upvote(ContentType.ANSWER, aTypesAda, aminata, kofi, omar);

        // ── Kofi : l'accessibilité sur petits téléphones, résolue par Ada ──
        Long qA11y = question(kofi, 44, "How do you test accessibility on low-end Android phones?", """
                Our users mostly have entry-level Android phones, and some rely on TalkBack. Lighthouse on my laptop says the app scores 98 for accessibility, but real users still report problems: focus jumping around, buttons that are hard to hit, text that overflows when the system font is larger.

                What does your testing routine look like on real devices?
                """, "Accessibilité", "Android", "Performance");
        Long aA11yAda = answer(ada, qA11y, """
                Lighthouse only checks what a machine can check. My routine on a real phone, about 15 minutes per screen:

                1. **TalkBack on, screen off.** Can I complete the task with swipes only? Is every button announced with a name?
                2. **System font at 200 %.** Nothing overflows, nothing is cut, no horizontal scroll.
                3. **Touch targets**: at least 48 × 48 dp, with space between them.
                4. **Remote debugging** from desktop Chrome (`chrome://inspect`) to look at the accessibility tree on the device itself.

                And slow the CPU down 6× in DevTools when testing on desktop: focus problems often come from re-renders that take too long.
                """);
        answer(thandiwe, qA11y, """
                Add Google's Accessibility Scanner app to that list: it overlays suggestions directly on your screens (contrast, target size, missing labels). It catches a lot before a TalkBack user ever does.
                """);
        accept(kofi, aA11yAda);
        upvote(ContentType.QUESTION, qA11y, ada, thandiwe, wanjiru, aminata);
        upvote(ContentType.ANSWER, aA11yAda, kofi, thandiwe, wanjiru, aminata, fatou);

        // ── Compose : résolu ──
        Long qCompose = question(thandiwe, 60, "Jetpack Compose: my LazyColumn stutters when scrolling, what should I check first?", """
                A list of about 300 transactions, each row with an avatar, two lines of text and an amount. Scrolling is smooth on my Pixel but stutters on the phones our agents use. I already removed the images to test: still stuttering.

                Where would you start?
                """, "Kotlin", "Android", "Performance");
        Long aComposeWanjiru = answer(wanjiru, qCompose, """
                In my experience, in this order:

                1. **Give each item a stable `key`** (`items(list, key = { it.id })`). Without it, Compose can't tell rows apart when the list changes.
                2. **Check that your row parameters are stable.** A `List<Transaction>` from a regular class is considered unstable, so every row recomposes on every frame. Mark the model `@Immutable` or use kotlinx immutable collections.
                3. **Never format in the composable.** `NumberFormat.getCurrencyInstance()` inside a row is expensive: format once in the view model.
                4. **Test a release build.** Debug builds of Compose are much slower; the stutter often disappears there.

                The Layout Inspector's recomposition counts will tell you which of these is your culprit.
                """);
        accept(thandiwe, aComposeWanjiru);
        upvote(ContentType.QUESTION, qCompose, wanjiru, kofi);
        upvote(ContentType.ANSWER, aComposeWanjiru, thandiwe, kofi, fatou, ada);

        // ── Wanjiru : deux avis opposés ──
        Long qBackend = question(wanjiru, 75, "Firebase or Supabase for an offline-first Flutter app?", """
                Starting a new app for field agents who spend whole days without network. I need auth, a database that syncs when the connection comes back, and file uploads for photos.

                Firebase has offline persistence built in. Supabase is Postgres, which the rest of our team knows well. Has anyone shipped an offline-first app with either one?
                """, "Flutter", "Firebase", "Offline");
        answer(fatou, qBackend, """
                Avec Firestore, la persistance hors-ligne est active par défaut sur mobile : les écritures sont gardées en file et envoyées au retour du réseau, sans code de ta part. Pour des agents de terrain, c'est un vrai gain de temps.

                Attention seulement à la facturation à la lecture : un écran qui relit 500 documents à chaque ouverture coûte vite cher.
                """);
        answer(yassine, qBackend, """
                Supabase n'a pas d'équivalent clé en main : il faut une base locale (Drift, Isar) et une synchronisation à écrire, comme décrit dans la question de Fatou sur le mode hors-ligne. En échange, tu gardes du SQL, des coûts prévisibles, et tu peux l'héberger toi-même.

                Si l'équipe connaît bien Postgres et que le volume va grandir, je prendrais ce chemin.
                """);
        upvote(ContentType.QUESTION, qBackend, fatou, yassine, selam);

        // ── Docker : Musa répond, Yassine accepte ──
        Long qDocker = question(yassine, 100, "Docker : mon image Spring Boot fait 450 Mo, comment la réduire ?", """
                Notre image est construite à partir de `openjdk:21` avec le jar copié dedans. Elle pèse 450 Mo, et sur la connexion de nos serveurs de staging, chaque déploiement prend plusieurs minutes juste pour la tirer.

                ```dockerfile
                FROM openjdk:21
                COPY target/app.jar app.jar
                ENTRYPOINT ["java", "-jar", "app.jar"]
                ```

                Quelles sont les pistes les plus efficaces ?
                """, "Docker", "Java", "DevOps");
        Long aDockerMusa = answer(musa, qDocker, """
                Trois étapes, du plus simple au plus poussé :

                1. **Une image de base JRE, pas JDK** : `eclipse-temurin:21-jre-alpine` divise déjà la taille par deux ou trois.
                2. **Les couches de Spring Boot** : le jar se découpe en dépendances (qui changent rarement) et en code de l'application. Docker ne retélécharge plus que la dernière couche, de quelques centaines de Ko.

                ```dockerfile
                FROM eclipse-temurin:21-jre-alpine AS build
                COPY target/app.jar app.jar
                RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

                FROM eclipse-temurin:21-jre-alpine
                COPY --from=build extracted/dependencies/ ./
                COPY --from=build extracted/spring-boot-loader/ ./
                COPY --from=build extracted/snapshot-dependencies/ ./
                COPY --from=build extracted/application/ ./
                ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
                ```

                3. **Un JRE sur mesure avec `jlink`**, qui ne garde que les modules utilisés : on descend souvent sous les 100 Mo.
                """);
        answer(awa, qDocker, """
                Autre option sans Dockerfile : `mvn spring-boot:build-image` (Buildpacks). Les couches sont faites pour toi, et l'image est mise à jour avec les correctifs de sécurité de la base à chaque build.
                """);
        accept(yassine, aDockerMusa);
        comment(yassine, ContentType.ANSWER, aDockerMusa, "Passés de 450 à 160 Mo avec les deux premières étapes, et le déploiement prend 20 secondes. Merci !");
        upvote(ContentType.QUESTION, qDocker, musa, awa, jeanPaul);
        upvote(ContentType.ANSWER, aDockerMusa, yassine, awa, jeanPaul, omar, samuel);

        // ── Chioma : résolu par Selam ──
        Long qWhisper = question(chioma, 130, "Fine-tuning Whisper for Yoruba: how many hours of audio do I really need?", """
                The base Whisper models handle Yoruba poorly, especially tone marks. We have about 12 hours of transcribed audio from community recordings, and could collect more, but recording and transcribing is slow and expensive.

                Is 12 hours enough to get a usable improvement, or is it pointless below 100 hours?
                """, "Machine Learning", "Python", "NLP");
        Long aWhisperSelam = answer(selam, qWhisper, """
                It is not pointless. We fine-tuned `whisper-small` on Amharic with 15 hours and the word error rate dropped from 78 % to 41 %. Not production quality, but a huge jump.

                What mattered most for us:

                - **Quality over quantity**: 10 clean hours beat 30 noisy ones. Remove misaligned segments first.
                - **Freeze the encoder** at first, and train only the decoder: it avoids overfitting on a small dataset.
                - **Normalise the text** consistently (tone marks, punctuation) before measuring anything, or your error rate will lie to you.

                Then use the fine-tuned model to pre-transcribe new recordings: correcting is much faster than transcribing from scratch.
                """);
        accept(chioma, aWhisperSelam);
        comment(chioma, ContentType.ANSWER, aWhisperSelam, "The pre-transcription loop is a great idea, our transcribers will love it.");
        upvote(ContentType.QUESTION, qWhisper, selam, jeanPaul, kofi);
        upvote(ContentType.ANSWER, aWhisperSelam, chioma, jeanPaul, wanjiru, yassine);

        // ── Selam : héberger pas cher ──
        Long qHosting = question(selam, 170, "Cheapest way to host a side project with a database, close to African users?", """
                I have a small side project (a Django API and a PostgreSQL database) with a few hundred users, mostly in Ethiopia and Kenya. Free tiers keep changing or going to sleep, and the big clouds' nearest regions are in Europe or South Africa.

                What do you use for this kind of project, and where?
                """, "DevOps", "PostgreSQL");
        answer(yassine, qHosting, """
                For a few hundred users, a single small VPS is plenty: 5 to 10 dollars a month, everything on it (API, Postgres, Nginx). See Chioma's question on running Django with 1 GB of RAM for the settings.

                For latency, a European region is often fine for East Africa thanks to the undersea cables; test from your users' networks before paying more for a closer region. And whatever you pick, automate daily backups of the database to another provider.
                """);
        answer(jeanPaul, qHosting, """
                Pour l'Afrique de l'Est, regarde aussi les hébergeurs locaux à Nairobi ou Kigali : les prix ont beaucoup baissé, et la latence est imbattable pour tes utilisateurs. Vérifie seulement qu'ils proposent des sauvegardes et une console pour reconstruire la machine.
                """);
        upvote(ContentType.QUESTION, qHosting, yassine, chioma);

        // ── Awa : la revue de code bienveillante ──
        Long qReview = question(awa, 220, "Revue de code : comment dire non à une PR sans décourager un junior ?", """
                Je relis les pull requests d'une équipe où arrivent beaucoup de juniors. Parfois une PR part dans la mauvaise direction : il faut tout reprendre. Mes commentaires sont justes techniquement, mais je vois des développeurs qui n'osent plus ouvrir de PR après.

                Comment refusez-vous une PR, ou demandez-vous de gros changements, sans casser la motivation ?
                """, "Revue de code", "Carrière");
        Long aReviewThandiwe = answer(thandiwe, qReview, """
                What changed things for my team:

                1. **Talk before writing.** If the whole direction is wrong, a 10-minute call beats 30 comments. Comments are for details.
                2. **Say what is good, specifically.** Not "nice work", but "the tests for the error cases are exactly right".
                3. **Label your comments**: *blocking*, *suggestion*, *question*, *nit*. A junior can't tell which of your 20 comments really matter.
                4. **Make it about the code, and the future**: "next time, let's agree on the approach in the issue before coding" turns a rejection into a process fix.

                And the real fix is upstream: a short design discussion in the issue prevents most wrong-direction PRs.
                """);
        answer(yassine, qReview, """
                Je termine toujours une grosse demande de changements par une proposition concrète : « je peux pairer avec toi demain 30 minutes là-dessus ». Le message passe de « tu t'es trompé » à « on avance ensemble ».
                """);
        answer(musa, qReview, """
                Et quand c'est toi qui te trompes dans une revue, dis-le dans le fil, publiquement. Les juniors voient qu'une revue est une discussion, pas un jugement.
                """);
        accept(awa, aReviewThandiwe);
        comment(awa, ContentType.ANSWER, aReviewThandiwe, "Les étiquettes sur les commentaires, on les a adoptées cette semaine : la différence se voit déjà.");
        upvote(ContentType.QUESTION, qReview, thandiwe, yassine, musa, kofi, jeanPaul, chioma, samuel, fatou);
        upvote(ContentType.ANSWER, aReviewThandiwe, awa, yassine, musa, kofi, samuel, ada, aminata);

        // ── Les comptes d'essai : leur fil et leur liste de lecture ──
        followTags(ada, "react", "typescript", "accessibilite", "performance");
        followTags(musa, "java", "spring-boot", "postgresql", "docker");
        bookmark(ada, qReview, qTypes, qPaging);
        bookmark(musa, qDocker, qReview, qHosting, qInterview);

        spreadDates();
        log.info("[Init] Forum prêt : {} sujets", questionRepository.count());
    }

    // ==================== CONTENU ====================

    private Long question(Long authorId, int hoursAgo, String title, String body, String... tags) {
        Long id = questionService.create(authorId, QuestionRequest.builder()
                .title(title)
                .body(body.strip())
                .tags(List.of(tags))
                .build()).getId();
        ages.put(id, hoursAgo);
        return id;
    }

    private Long answer(Long authorId, Long questionId, String body) {
        return answerService.create(authorId, questionId, AnswerRequest.builder().body(body.strip()).build()).getId();
    }

    private void accept(Long questionAuthorId, Long answerId) {
        answerService.accept(questionAuthorId, answerId);
    }

    private void comment(Long authorId, ContentType targetType, Long targetId, String body) {
        commentService.create(authorId, CommentRequest.builder()
                .targetType(targetType)
                .targetId(targetId)
                .body(body)
                .build());
    }

    private void upvote(ContentType targetType, Long targetId, Long... voterIds) {
        for (Long voterId : voterIds) {
            voteService.vote(voterId, VoteRequest.builder().targetType(targetType).targetId(targetId).value(1).build());
        }
    }

    private void followTags(Long developerId, String... tagSlugs) {
        for (String tagSlug : tagSlugs) {
            userService.followTag(developerId, tagSlug);
        }
    }

    private void bookmark(Long developerId, Long... questionIds) {
        for (Long questionId : questionIds) {
            bookmarkService.save(developerId, questionId);
        }
    }

    // ==================== DATES ====================

    /**
     * Tout vient d'être créé à la même seconde. Chaque sujet reçoit son âge (de 1 heure à 9 jours, mêlés aux
     * premières questions de la communauté) ; ses réponses arrivent ensuite dans l'ordre, puis les commentaires
     * sous chaque réponse, toujours avant maintenant. Les enregistrements suivent l'ordre où ils ont été faits.
     */
    private void spreadDates() {
        ages.forEach((id, hours) -> jdbcTemplate.update(
                "UPDATE questions SET created_at = now() - make_interval(hours => ?) WHERE id = ?", hours, id));

        String ids = ages.keySet().stream().map(String::valueOf).collect(Collectors.joining(","));
        // La n-ième réponse d'un sujet arrive aux n × 18 % du temps écoulé depuis sa publication
        jdbcTemplate.update("""
                UPDATE answers a
                SET created_at = q.created_at + (now() - q.created_at) * (r.rank * 0.18)::float8
                FROM questions q,
                     (SELECT id, ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY id) AS rank FROM answers) r
                WHERE q.id = a.question_id AND r.id = a.id AND q.id IN (%s)
                """.formatted(ids));
        // Le n-ième commentaire d'une réponse, aux n × 22 % du temps écoulé depuis la réponse
        jdbcTemplate.update("""
                UPDATE comments c
                SET created_at = a.created_at + (now() - a.created_at) * (r.rank * 0.22)::float8
                FROM answers a,
                     (SELECT id, ROW_NUMBER() OVER (PARTITION BY target_id ORDER BY id) AS rank
                      FROM comments WHERE target_type = 'ANSWER') r
                WHERE c.target_type = 'ANSWER' AND c.target_id = a.id AND r.id = c.id AND a.question_id IN (%s)
                """.formatted(ids));
        jdbcTemplate.update("""
                UPDATE bookmarks SET created_at = now() - make_interval(mins => (((SELECT max(id) FROM bookmarks) - id) * 47)::int)
                WHERE question_id IN (%s)
                """.formatted(ids));

        List<String> updates = new ArrayList<>();
        updates.add("UPDATE questions SET updated_at = created_at WHERE id IN (%s)");
        updates.add("UPDATE answers SET updated_at = created_at WHERE question_id IN (%s)");
        updates.add("UPDATE bookmarks SET updated_at = created_at WHERE question_id IN (%s)");
        updates.forEach(sql -> jdbcTemplate.update(sql.formatted(ids)));
        jdbcTemplate.update("""
                UPDATE comments c SET updated_at = c.created_at
                FROM answers a WHERE c.target_type = 'ANSWER' AND c.target_id = a.id AND a.question_id IN (%s)
                """.formatted(ids));
    }
}
