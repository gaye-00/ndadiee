# Ndadiee — backend

Spring Boot 4, Java 21, PostgreSQL, JWT.

**Schéma et données.** Flyway applique les migrations versionnées de `src/main/resources/db/migration` avant que
Hibernate ne valide le schéma (`ddl-auto: validate` dans tous les profils). `V1__initial_schema.sql` définit le schéma
initial complet. Une base neuve est créée automatiquement par cette migration. Pour une base historique sans table de
version Flyway, sauvegarder et comparer le schéma à V1, puis faire une baseline explicite en version 1 ; ne pas
configurer de baseline automatique. Les entités portent les index (y compris les index
partiels, `@Index(options = "where …")`), contraintes uniques et `CHECK` nommées (`uk_…`, `ck_…`), suppressions en
cascade (`@OnDelete`). L'index unique partiel (un sprint ouvert par projet) est dans la migration et vérifié par
`initializer/DatabaseConstraints`. Les données de démonstration viennent ensuite, seulement sur activation explicite
des seeders, dans l'ordre d'`initializer/InitializerNdadiee`.

Base locale attendue : PostgreSQL, généralement démarré par le Compose du dépôt sur le port `5434`. La clé `JWT_SECRET`
est requise dans tous les profils et validée au démarrage.

```bash
SPRING_PROFILES_ACTIVE=local JWT_SECRET="$(openssl rand -base64 48)" ./mvnw spring-boot:run
```

Pour tester, fournir une base PostgreSQL jetable et isolée avant `./mvnw test`; la suite applique Flyway puis Hibernate
valide le schéma. Ne jamais utiliser le volume de développement pour le profil de test.

Sur une base historique sans `flyway_schema_history`, et uniquement après une sauvegarde vérifiée et une comparaison
du schéma existant avec V1, définir `FLYWAY_URL`, `FLYWAY_USER` et `FLYWAY_PASSWORD`, puis exécuter depuis `backend/` :

```bash
FLYWAY_BASELINE_VERSION=1 ./mvnw flyway:baseline
```

Cette opération écrit la métadonnée de baseline ; elle ne crée pas ni ne modifie les tables métier. Le démarrage suivant
exécute les migrations ultérieures puis `ddl-auto=validate`. Une divergence détectée par Hibernate doit bloquer le
déploiement et être corrigée par une migration revue, jamais par `update`.

## Données de démonstration (init)

Au démarrage, `initializer/InitializerNdadiee.java` synchronise les badges puis, uniquement si `SEED_ENABLED=true`,
remplit la base. Les seeders sont désactivés par défaut. Leur activation exige les trois variables `SEED_ADMIN_PASSWORD`,
`SEED_DEMO_PASSWORD` et `SEED_TEST_ACCOUNT_PASSWORD`; l’application échoue avant l’initialisation si l’une manque.

1. `DemoDataSeeder` : la communauté (comptes, questions et réponses, articles, opportunités) ;
2. `ShowcaseSeeder` : la vitrine (10 projets avec couverture et galerie, équipes où chacun a son rôle,
   étoiles, 24 rôles recherchés qui couvrent les 13 rôles du catalogue et 8 candidatures en attente,
   devlog, demandes de retours, activité GitHub, licence) ;
3. `TestAccountsSeeder` : deux comptes d'essai pour se connecter. Ils existent à chaque démarrage,
   même dans une base déjà remplie, et leur mot de passe suit la configuration (le hachage est refait
   s'il a changé). Quelques membres de la vitrine les suivent : leur cloche n'est pas vide.
4. `ForumSeeder` : 14 sujets de plus sur trois semaines (24 en tout), des fils de commentaires sous les
   réponses, des sujets encore sans réponse. Ada attend d'accepter une réponse à sa question, Musa a résolu
   celle de Yassine ; tous deux suivent des tags (« Mon fil ») et ont déjà enregistré des sujets (liste de
   lecture). Créé une seule fois : si son premier sujet existe, rien n'est refait.

Les comptes de démonstration ne sont créés que dans un environnement local dédié après opt-in et configuration
explicite de mots de passe locaux. Ne pas utiliser ou publier des identifiants de démonstration en production.
Les mots de passe sont stockés sous forme hachée BCrypt (`PasswordEncoder`), comme à l'inscription.

Chaque section ne s'exécute que si sa table est vide, et les comptes existants sont retrouvés par leur
identifiant (`DemoAccounts`) : une base remplie à moitié est complétée au démarrage suivant. Tout passe
par les services métier (réputation, badges et notifications cohérents). Comptes : `awa_diop`
(modératrice), `samuel_ngono`, `aminata_traore`… et `admin` ; mots de passe : `SEED_DEMO_PASSWORD`,
`SEED_ADMIN_PASSWORD`.

Ne pas supprimer le volume pour réinitialiser une base. Pour les essais destructifs, utiliser une base temporaire
jetable, sans volume partagé.

## Administration (back-office)

Un compte `Admin` (rôle `ADMIN`) ne participe pas à la communauté : à la connexion, le frontend l'envoie sur son
back-office (`/admin`), un développeur sur son atelier (`/dashboard`). En local, le compte est créé seulement si les
seeders sont activés explicitement et qu’un mot de passe local dédié est fourni.

| Requête | Accès |
| --- | --- |
| `GET /v1/admin/overview` | admin : membres (modérateurs, suspendus, nouveaux et actifs sur 7 jours), contenus (masqués compris), inscriptions par jour sur 30 jours, dernières décisions |
| `GET /v1/admin/users?q=&role=&status=ACTIVE\|BLOCKED` | admin : les comptes, avec ce que chacun a publié |
| `POST /v1/admin/users/{id}/block` `{ reason }`, `POST …/unblock` | admin : suspendre (motif obligatoire), réactiver |
| `PATCH /v1/admin/users/{id}/role` `{ role }` | admin : `USER` ou `MODERATOR` (jamais `ADMIN`) |
| `GET /v1/admin/content?type=QUESTION\|ANSWER\|PROJECT&q=&visibility=VISIBLE\|HIDDEN` | admin : sujets, réponses ou projets, masqués compris |
| `POST /v1/admin/content/{type}/{id}/hide` `{ reason }`, `POST …/unhide` | admin : masquer (motif obligatoire), rétablir |
| `DELETE /v1/admin/content/{type}/{id}?reason=` | admin : supprimer définitivement (par les services du contenu, comme un modérateur) |
| `GET /v1/admin/actions?targetType=` | admin : le journal des décisions, les plus récentes d'abord |

- **Droits** : deux barrières. Les règles d'URL de `SecurityConfiguration` (`admin:read` en lecture, `admin:update`,
  `admin:delete`), placées avant toutes les autres, et `@PreAuthorize("hasRole('ADMIN')")` sur `AdminController`. Un
  modérateur garde ses droits sur le contenu (modifier, supprimer) mais n'entre pas au back-office. Testé par
  `AdminSecurityTest`.
- **Compte suspendu** (`User.blockedAt`, `blockedReason`) : connexion refusée (403 `ACCOUNT_BLOCKED`, le motif dans
  `details.reason`), seulement une fois le mot de passe vérifié, pour ne rien apprendre à un tiers ; refresh refusé ;
  ses jetons encore valides n'authentifient plus (`JwtAuthenticationFilter`). Ce qu'il a publié reste en ligne. Un
  compte d'administration ne se suspend pas, et personne ne se suspend soi-même.
- **Contenu masqué** (`Hideable` : `hiddenAt`, `hiddenReason` sur `Question`, `Answer`, `Project`) : il quitte les
  listes, la recherche, le fil, les facettes, les statistiques, la liste de lecture et les compteurs des profils ; ses
  annonces (projet) aussi. Sa page répond 404, sauf à son auteur (l'équipe, pour un projet) et aux admins, qui la voient
  avec le motif (`hidden`, `hiddenReason`). Il ne se vote ni ne se commente plus. Une réponse masquée sort du compteur
  de réponses de son sujet (un sujet dont la seule réponse est masquée redevient « sans réponse ») et y revient si elle
  est rétablie.
- **Journal** (`admin_actions`, `AdminAuditService`) : chaque décision, dans la même transaction, avec son motif et le
  libellé de sa cible au moment de l'action (la cible a pu être supprimée depuis). Il ne s'efface pas.
- **Démonstration** (`ModerationSeeder`) : un compte de spam (`cash_rapide`) suspendu, son sujet et sa réponse
  masqués, et `thandiwe_ndlovu` nommée modératrice ; le journal porte ces décisions.

## Inscription et connexion

| Requête | Accès |
| --- | --- |
| `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh` | public |
| `GET /v1/auth/username-availability?username=` | public : le nom est-il libre ? Sinon pourquoi (`INVALID`, `RESERVED`, `TAKEN`) et trois variantes libres |
| `GET /v1/auth/me` | connecté |

Une erreur qui concerne un champ (e-mail déjà inscrit, nom pris ou réservé) le dit : `validationErrors`
porte ce champ (`{ "email": "…" }`), avec le code de l'erreur (`DUPLICATE_RESOURCE`,
`OPERATION_NOT_ALLOWED`). Le formulaire l'affiche sous le bon champ. Pour une nouvelle erreur de ce
genre : le constructeur des exceptions qui prend le nom du champ (`BusinessException`).

## Rôles recherchés (annonces)

`ProjectOpening` : un rôle du catalogue (`TeamRole` : FRONTEND, MOBILE, DESIGN…), un intitulé libre, une
description, un nombre de places et une issue « premier pas ». Le frontend associe à chaque rôle son
libellé et son motif tissé (`frontend/src/config/roles.ts`) : les deux listes restent alignées.

| Requête | Accès |
| --- | --- |
| `GET /v1/openings?role=&q=&tag=&country=&sort=` | public : rôles ouverts, avec leur projet (technologies, dépôt) et leurs candidatures en attente (`applicants`) ; pour un membre connecté, sa participation au projet (`project.myMembershipStatus`), sa compatibilité (`match`, pas pour ses propres équipes) et sa candidature (`appliedByMe`) |
| `GET /v1/openings/facets`, mêmes filtres | public : pour chaque rôle, technologie et pays du porteur, le nombre d'annonces avec les autres filtres ; `all` (sans rôle), `total`, `seats`, `projects` et `unclaimed` (sans candidature en attente) |
| `GET /v1/openings/{id}` | public : une annonce, comme dans la liste, même déjà pourvue (`open: false`) |
| `GET /v1/openings/roles` | public : par rôle, annonces, places et projets (bande de l'accueil) |
| `GET /v1/openings/stacks?limit=` | public : par technologie des projets qui recrutent, annonces, places et projets, les plus demandées d'abord (accueil, « Se rencontrer ») |
| `POST /v1/projects/{id}/openings` | porteur du projet, mainteneurs, modérateurs |
| `PUT /v1/openings/{id}`, `PATCH /v1/openings/{id}/open?open=false`, `DELETE /v1/openings/{id}` | idem |

- **Recherche** (`q`) : chaque mot doit se trouver dans l'annonce (intitulé, description, issue « premier pas »)
  ou dans son projet (nom, accroche, technologie). `country` : le pays du porteur du projet.
- **Filtres** : `OpeningFilter` et `ProjectOpeningSpecifications` (technologies par sous-requête : une ligne par
  annonce). Facettes : `OpeningFacetRepositoryImpl`, une requête groupée par facette.
- **Ordre** : celui demandé (`createdAt,desc` par défaut, `seats,desc`…), départagé par l'identifiant
  (`common/Pageables`). Deux ordres se calculent sur toutes les annonces des filtres, à égalité les plus récentes
  d'abord : `sort=match`, les plus proches du profil du membre connecté (`OpeningMatcher` ; pour un visiteur, les
  plus récentes), et `sort=applicants,asc`, les moins demandées.

Un projet renvoie aussi son accroche, sa couverture (et sa miniature, son crédit), ses rôles ouverts et
son équipe (`ProjectResponse`).

## Vitrine (filtres et facettes)

| Requête | Accès |
| --- | --- |
| `GET /v1/projects?q=&tag=&lookingForContributors=&role=&country=&owner=` | public : les projets ; `role`, un rôle d'une de leurs annonces ouvertes (`MOBILE`) ; `country`, le pays du porteur (`SN`) |
| `GET /v1/projects/facets`, mêmes filtres | public : pour chaque rôle recherché, technologie et pays, le nombre de projets avec les autres filtres ; `all` (sans rôle ni recrutement), `recruiting`, `total` et `seats` (places des annonces ouvertes) |

- **Recherche** (`q`) : chaque mot doit se trouver dans le nom, l'accroche, la description ou une technologie
  du projet (« nlp wolof » trouve wolof-nlp).
- **Filtres** : `ProjectFilter` et `ProjectSpecifications`. Technologies et annonces passent par des
  sous-requêtes (EXISTS) : une ligne par projet. Facettes : `ProjectFacetRepositoryImpl`, une requête groupée
  par facette (les 100 technologies les plus présentes au plus).
- **Ordre** : celui demandé (`sort=starsCount,desc`, `createdAt,desc`), départagé par l'identifiant : d'une
  page à l'autre de la vitrine, un projet n'est ni vu deux fois ni sauté.
- **Slugs réservés** : `facets` (l'API) et `new` (l'application, `/projects/new`) ne deviennent jamais
  l'adresse d'un projet.

## Page projet (design 3D)

| Requête | Accès |
| --- | --- |
| `GET /v1/projects/{slug}` | public : le projet, sa galerie (`gallery`, après la couverture), l'activité de son dépôt (`github`) et sa licence ; pour chaque rôle ouvert, ses candidatures en attente (`applicants`) et, pour un membre connecté hors de l'équipe, sa compatibilité (`match`) et sa candidature (`appliedByMe`) |
| `POST /v1/projects/{id}/join`, corps facultatif `{ openingId, motivation }` | connecté : candidature, à un rôle ouvert ou sans rôle |
| `PUT /v1/projects/{id}/members/me` `{ specialty }` | membre de l'équipe : le rôle qu'il y tient (« mobile ») |
| `GET /v1/projects/{id}/devlog?page=&size=` | public, les entrées les plus récentes d'abord |
| `POST /v1/projects/{id}/devlog` | équipe du projet |
| `GET /v1/projects/{id}/feedback-calls` | public : demandes de retours ouvertes, retours comptés, note moyenne, `givenByMe` |
| `POST /v1/projects/{id}/feedback-calls` | porteur, mainteneurs |
| `POST /v1/projects/{id}/feedback-calls/{callId}/feedback` | connecté, une fois par demande (409 ensuite) ; pas l'auteur de la demande |
| `GET /v1/projects/{id}/feedback-calls/{callId}/feedback` | équipe du projet, modérateurs |
| `POST /v1/projects/{id}/media`, `DELETE /v1/projects/{id}/media/{mediaId}` | porteur, mainteneurs, modérateurs (12 images au plus) |

- **Compatibilité** (`OpeningMatcher`) : chaque compétence du profil propre au métier du rôle comble 45 % de
  l'écart restant, chaque technologie du projet 30 % (deux compétences du métier : 70 %) ; jamais 100 %.
  Elle donne aussi les compétences qui l'expliquent.
- **Candidature à un rôle** : son rôle devient la spécialité du membre ; quand les places d'un rôle sont
  toutes prises (candidatures acceptées), l'annonce se ferme.
- **Activité GitHub** : un relevé par projet (`project_github_activity`), remplacé à chaque synchronisation
  (`GithubActivityService.record`). Pas encore de synchronisation réelle : seules les données de
  démonstration en écrivent.

## Espace d'équipe (design 3E)

L'espace d'un projet (`/v1/projects/{slug}/workspace`, `WorkspaceController`) est réservé à son équipe : le porteur
et les membres acceptés (403 sinon ; un projet masqué n'existe que pour son équipe, 404 pour les autres). Code :
`model/workspace`, `service/workspace`.

| Requête | Accès |
| --- | --- |
| `GET …/workspace` | l'équipe et qui est en ligne, le sprint en cours et son avancement, le dernier numéro de sprint, les PR ouvertes, les rôles ouverts, les candidatures à étudier (pour qui gère l'équipe) |
| `POST …/workspace/pulse` | le pouls : note la présence du membre ; rend qui est en ligne et trois révisions (`board`, `team`, `chat`) |
| `GET …/workspace/tasks`, `GET …/tasks/{number}` | le tableau (tâches pas encore livrées), ou une tâche, même livrée |
| `POST …/workspace/tasks` `{ title, description, role, assigneeId, pullRequestNumber, status }` | une tâche, numérotée à la suite, en bas de sa colonne |
| `PUT …/tasks/{number}` (même corps) | la modifier ; une autre colonne l'y envoie, en bas |
| `PUT …/tasks/{number}/position` `{ status, position }` | la glisser à une place d'une colonne ; le tableau entier en retour |
| `DELETE …/tasks/{number}` | son auteur, ou qui gère l'équipe |
| `GET …/workspace/pull-requests` | les PR qu'une tâche peut livrer (ouvertes, puis fusionnées ou fermées depuis un mois) |
| `POST …/workspace/sprints` `{ goal, weeks }`, `POST …/sprints/current/close` | porteur, mainteneurs |
| `GET …/workspace/messages?before=&size=` | la discussion, du plus ancien au plus récent, page par page, et le rendez-vous épinglé |
| `POST …/workspace/messages` `{ body }`, `POST …/workspace/events` `{ title, startsAt, durationMinutes, link }` | un message, un rendez-vous (celui qui le propose y sera) |
| `PUT` / `DELETE …/messages/{id}/attendance` | « J'y serai », ou plus (tant que le rendez-vous n'est pas fini) |
| `DELETE …/messages/{id}` | son auteur, ou qui gère l'équipe |
| `PATCH /v1/projects/{id}/settings` `{ repositoryUrl, lookingForContributors }` | porteur, modérateurs : le dépôt et le recrutement, sans toucher au reste du projet |
| `DELETE /v1/projects/{id}/members/{memberId}` | porteur, mainteneurs : retirer un membre (jamais le porteur, jamais soi-même) |

- **Tâches** (`Task`) : un numéro par projet, qui ne change jamais (« #38 », celui qu'on écrit dans la discussion) ; un
  métier du catalogue (`TeamRole`), une personne de l'équipe, la PR qui la livre (`TaskPullRequests` en donne le
  verdict : changements demandés, approuvée, revue attendue). Les places d'une colonne se suivent sans trou ; chaque
  geste renumérote les colonnes qu'il touche. Changer de colonne note quand et qui (`statusChangedAt`, `movedBy`).
- **Gestes concurrents** : créer, déplacer, supprimer une tâche, ouvrir ou clore un sprint verrouillent la ligne du
  projet (`ProjectRepository.findByIdForUpdate`) : deux membres qui glissent des cartes en même temps passent l'un après
  l'autre, sans doublon de numéro ni de place.
- **Sprints** (`Sprint`) : un seul en cours (index unique partiel, `DatabaseConstraints`). Le clore range les tâches
  terminées (`Task.sprint`) : elles quittent le tableau, livrées pendant ce sprint, et se lisent encore (lecture seule).
- **Discussion** (`TeamMessage`, `TeamEventAttendee`) : messages et rendez-vous dans un même fil, paginé par
  identifiant (un message arrivé entre deux pages ne décale rien). Le prochain rendez-vous (ou celui en cours) est
  rendu à part, pour rester épinglé.
- **Le pouls** : chaque onglet ouvert le demande toutes les quatre secondes (quinze en économie de données, rien en
  arrière-plan). La présence s'écrit au plus toutes les 20 s (`ProjectMember.lastSeenAt`, requête directe : la date de
  modification de la participation ne bouge pas) ; en ligne = vu dans la dernière minute. Chaque révision est un
  compte et une dernière modification (`Revision`) : le frontend ne relit que la partie qui a changé. Pas de connexion
  permanente à tenir.
- **Départs** : quitter l'équipe, en être retiré ou refusé après coup publie `ProjectMemberLeftEvent` ; ses tâches
  attendent un nouveau preneur (`TaskService.onMemberLeft`).
- **Démonstration** (`WorkspaceSeeder`, après les revues) : lagos-transit au sprint 7 (« Notifications de départ », six
  jours restants), ses tâches dans les quatre colonnes, les issues « premier pas » de ses annonces (#33, #40, #45), la
  #77 d'Ama liée à sa PR #84, et une discussion où Tunde propose un pair programming à 15 h (heure de Lagos) ; Paperweight
  (Ada et Tunde, sans sprint) ; momo-sdk au sprint 3 (musa). Le dossier patient d'OpenMRS, d'Ada, reste vide.

## Forum

Un sujet du forum est une `Question` (`/v1/questions`), ses réponses des `Answer`, et les commentaires sous une
réponse (ou sous le sujet : les « précisions ») des `Comment`.

| Requête | Accès |
| --- | --- |
| `GET /v1/questions?q=&tag=&author=&unanswered=&solved=&period=&following=&sort=` | public (`following=true` : membre connecté) : les sujets, avec pour un membre connecté ceux qu'il a enregistrés (`bookmarkedByMe`) |
| `GET /v1/questions/overview` | public : sujets, résolus, sans réponse, réponses, contributeurs, et les 15 tags les plus utilisés du forum avec leur nombre de sujets |
| `GET /v1/questions/{slug}` | public, compte une vue : le sujet, son temps de lecture, le vote et l'enregistrement du membre connecté |
| `GET /v1/questions/{id}/answers` | public : la réponse acceptée, puis les mieux notées ; chacune avec son fil de commentaires (`comments`), chargé en une requête pour toute la page |
| `GET /v1/questions/saved` | connecté : la liste de lecture, les derniers enregistrés d'abord |
| `POST /v1/questions/{id}/bookmark`, `DELETE …/bookmark` | connecté : enregistrer, retirer (sans erreur si c'est déjà fait) |
| `POST /v1/questions`, `PUT /v1/questions/{id}`, `PATCH …/status`, `DELETE …` | connecté ; modifier, fermer, supprimer : auteur ou modérateur (un sujet qui a des réponses : modérateur seulement) |

- **Ordres** (`sort`) : `hotness,desc` (« Pertinents » : votes et réponses pondérés par l'âge, comme Hacker News, calculé
  par la base : `Question.hotness`, `@Formula`), `createdAt,desc` (récents), `score,desc` (top, avec `period=WEEK`,
  `MONTH` ou `YEAR`). Départagés par l'identifiant (`common/Pageables`).
- **Filtres** : `QuestionFilter` et `QuestionSpecifications`. La recherche veut chaque mot dans le titre, le contenu
  ou un tag ; les tags passent par une sous-requête (EXISTS). `solved` : avec (ou sans) réponse acceptée.
  `following=true` : les sujets des auteurs et des tags que suit le membre (rien de suivi : un fil vide).
- **Liste de lecture** : `Bookmark` (membre, sujet, date), unique par membre et par sujet ; l'insertion passe par
  `ON CONFLICT DO NOTHING`, un double clic ne fait pas d'erreur. Le sujet supprimé, ses enregistrements partent avec
  lui (`@OnDelete` sur `Bookmark`).
- **Slugs réservés** : `new` (l'application, `/forum/new`), `saved` et `overview` (l'API) ne deviennent jamais
  l'adresse d'un sujet.

## Images du forum (Cloudflare R2)

`POST /v1/uploads/images` (connecté, `multipart/form-data`, champ `file`) : l'adresse publique de l'image, que le
frontend écrit dans le Markdown.

- **Contrôles** (`service/media/ImageUploadService`) : JPEG, PNG, WebP ou GIF, reconnus à leurs premiers octets
  (jamais le nom ni le type annoncé : un SVG renommé est refusé), 5 Mo au plus (`STORAGE_MAX_IMAGE_SIZE`), 40 envois
  par membre et par heure (`STORAGE_MAX_UPLOADS_PER_HOUR`, compté en mémoire, par serveur). Erreurs : 413, 415, 429.
- **Clés** : `forum/{membre}/{année}/{mois}/{uuid}.{ext}`, neuves et imprévisibles ; le préfixe du membre permet de
  retrouver ses fichiers. Un fichier ne change jamais : servi avec `Cache-Control: public, max-age=31536000, immutable`.
- **Stockage** (`storage/`) : `FileStorage`, deux implémentations. `R2FileStorage` (SDK AWS S3, l'API compatible S3 de
  R2) dès que ses réglages sont complets ; sinon `LocalFileStorage`, le disque (`backend/uploads`, servi sous
  `/api/uploads/**`), pour le développement. `STORAGE_PROVIDER=r2` impose R2 : sans ses réglages, l'application refuse
  de démarrer.

Pour brancher R2 :

1. Tableau de bord Cloudflare > R2 : créer le bucket, puis lui donner une adresse publique (un domaine relié, conseillé
   en production, ou l'adresse `r2.dev`).
2. R2 > Gérer les jetons d'API : un jeton « Lecture et écriture d'objets » limité à ce bucket.
3. Renseigner `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (voir
   `.env.example`), et en production `STORAGE_PROVIDER=r2`. Au démarrage, le journal dit
   `[Storage] Fichiers des membres : Cloudflare R2 (bucket …)`.

Les images envoyées mais jamais publiées (brouillon abandonné) restent dans le bucket : une règle de cycle de vie, ou
une tâche de nettoyage, pourra les retirer.

## Profil (design 3F)

`GET /v1/users/{username}` (public) : la fiche du développeur, ses badges, et ses preuves de travail en plus de ses
compteurs du forum : `projectCount` (projets lancés), `teamCount` (équipes rejointes hors de ses projets),
`acceptedAnswerCount`, `hackathonCount` (hackathons commencés où il avait une équipe) et `podiumCount`. Comme les autres
chiffres, seulement ce que le public peut voir : rien de masqué par l'administration. Chaque badge porte son `type`
(`BadgeType`, ou `null` pour un badge ajouté à la main) : le frontend en traduit le nom.

| Route (publique) | Rôle |
|---|---|
| `GET /v1/users/{username}/projects?page=&size=` | ses projets (6 par page), avec sa place dans l'équipe (`role`, `specialty`, `joinedAt`) : ceux qu'il porte d'abord, puis les plus étoilés. Un projet masqué n'y reste que pour lui et les admins |
| `GET /v1/users/{username}/collaborators` | ses coéquipiers sur ses projets visibles (8 au plus), ceux des projets en commun les plus nombreux d'abord, avec deux de ces projets |
| `GET /v1/users/{username}/activity` | ses contributions jour par jour (UTC) sur 53 semaines, les jours vides en moins : sujets, réponses, commentaires, articles publiés, projets lancés, notes de devlog et retours (`DeveloperRepository.findContributionDates`, une requête) |

### Photo de profil

`PUT /v1/users/me/avatar` (connecté, `multipart/form-data`, champ `file`) la remplace, `DELETE /v1/users/me/avatar` la
retire ; les deux rendent le compte à jour. `PUT /v1/users/me` ne touche plus à la photo.

- **Préparation** (frontend, `lib/avatarImage.ts`) : le membre cadre sa photo dans un cercle ; le navigateur en fait un
  carré de 512 px en WebP (JPEG si le navigateur ne sait pas écrire le WebP), quelques dizaines de Ko, sans les
  métadonnées de la photo.
- **Contrôles** (`service/media/AvatarService`, par `ImageUploadService`) : JPEG, PNG ou WebP (pas de GIF : une photo
  de profil est fixe), 1 Mo au plus, dans le même compte d'envois par heure que les images du forum.
- **Clés** : `avatars/{membre}/{uuid}.{ext}`, dans le même stockage (R2 en production).
- **Ménage** : le stockage n'est pas transactionnel. L'ancienne photo n'est supprimée qu'une fois le profil enregistré ;
  si l'enregistrement échoue, c'est la nouvelle qui l'est. Seul un fichier `avatars/{membre}/` du membre lui-même est
  jamais supprimé (`FileStorage.keyOf` retrouve la clé dans l'adresse). Une suppression qui échoue est journalisée,
  sans casser le profil.

## Chiffres de la communauté

`GET /v1/stats` (public) : développeurs, pays représentés, projets, rôles ouverts et places qu'ils
proposent, comptés en base à chaque demande (bannière finale de l'accueil).

## Médias

`src/main/resources/static/media` est servi sous `/api/media/**`, mis en cache un mois. Un chemin de
média enregistré en base (« media/demo/projects/x.webp ») devient une adresse complète sur l'hôte de la
requête (`common/MediaUrls.java`). Les couvertures de démonstration viennent de Wikimedia Commons :
auteurs et licences dans `static/media/demo/CREDITS.md`. Les galeries (`projects/gallery/`) sont des
captures des applications de démonstration, dessinées pour la vitrine.
