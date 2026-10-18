# Ndadiee — backend

Spring Boot 4, Java 21, PostgreSQL (Flyway), JWT.

Base attendue : le PostgreSQL local (`localhost:5432`, base, utilisateur et mot de passe `ndadiee`).

```bash
sudo -u postgres psql -c "CREATE ROLE ndadiee LOGIN PASSWORD 'ndadiee'" -c "CREATE DATABASE ndadiee OWNER ndadiee"
mvn spring-boot:run      # http://localhost:8080/api, documentation : /api/swagger-ui.html
mvn test                 # le test de démarrage a besoin de la base
```

Pour utiliser plutôt le conteneur (`docker compose up -d`, port 5434) :
`SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5434/ndadiee mvn spring-boot:run`.

## Données de démonstration (init)

Au démarrage, `initializer/InitializerNdadiee.java` synchronise les badges, puis, si `SEED_ENABLED`
(vrai par défaut), remplit la base :

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

| Compte d'essai | Identifiant | Mot de passe en développement |
| --- | --- | --- |
| Ada Nwosu | `ada@example.com` ou `ada` | `passer@123` (`SEED_TEST_ACCOUNT_PASSWORD`) |
| Musa Diallo | `musa@example.com` ou `musa` | `passer@123` (`SEED_TEST_ACCOUNT_PASSWORD`) |

Ce mot de passe est réservé au développement et peut être remplacé avec `SEED_TEST_ACCOUNT_PASSWORD`.
Les autres comptes de démonstration utilisent `SEED_DEMO_PASSWORD` ; `admin` a le sien (`SEED_ADMIN_PASSWORD`).

Les mots de passe ne sont jamais stockés en clair : hachés en BCrypt (`PasswordEncoder`), comme à
l'inscription. Les valeurs par défaut de `application.yaml` servent au développement ; en production,
`SEED_ENABLED=false` (aucun compte de démonstration), et sinon des mots de passe propres à l'environnement.

Chaque section ne s'exécute que si sa table est vide, et les comptes existants sont retrouvés par leur
identifiant (`DemoAccounts`) : une base remplie à moitié est complétée au démarrage suivant. Tout passe
par les services métier (réputation, badges et notifications cohérents). Comptes : `awa_diop`
(modératrice), `samuel_ngono`, `aminata_traore`… et `admin` ; mots de passe : `SEED_DEMO_PASSWORD`,
`SEED_ADMIN_PASSWORD`.

Pour repartir de zéro : supprimer le volume de la base (`docker compose down -v`), puis relancer.

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
- La migration `V3__project_page.sql` tient dans un bloc `DO` : avec `ddl-auto: create-drop`, Hibernate a
  supprimé les tables à l'arrêt précédent et les recrée après Flyway, la migration n'a alors rien à
  modifier ; avec `validate`, elle s'applique entièrement.

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
  lui (`V5__forum_bookmarks.sql`).
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

## Chiffres de la communauté

`GET /v1/stats` (public) : développeurs, pays représentés, projets, rôles ouverts et places qu'ils
proposent, comptés en base à chaque demande (bannière finale de l'accueil).

## Médias

`src/main/resources/static/media` est servi sous `/api/media/**`, mis en cache un mois. Un chemin de
média enregistré en base (« media/demo/projects/x.webp ») devient une adresse complète sur l'hôte de la
requête (`common/MediaUrls.java`). Les couvertures de démonstration viennent de Wikimedia Commons :
auteurs et licences dans `static/media/demo/CREDITS.md`. Les galeries (`projects/gallery/`) sont des
captures des applications de démonstration, dessinées pour la vitrine.
