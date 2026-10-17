# Ndadiee — backend

Spring Boot 4, Java 21, PostgreSQL (Flyway), JWT.

```bash
docker compose up -d     # PostgreSQL, depuis la racine du dépôt
mvn spring-boot:run      # http://localhost:8080/api, documentation : /api/swagger-ui.html
mvn test                 # le test de démarrage a besoin de la base
```

## Données de démonstration (init)

Au démarrage, `initializer/InitializerNdadiee.java` synchronise les badges, puis, si `SEED_ENABLED`
(vrai par défaut), remplit la base :

1. `DemoDataSeeder` : la communauté (comptes, questions et réponses, articles, opportunités) ;
2. `ShowcaseSeeder` : la vitrine (10 projets avec couverture, équipes, étoiles et 24 rôles recherchés,
   qui couvrent les 13 rôles du catalogue) ;
3. `TestAccountsSeeder` : deux comptes d'essai pour se connecter. Ils existent à chaque démarrage,
   même dans une base déjà remplie, et leur mot de passe suit la configuration (le hachage est refait
   s'il a changé).

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
| `GET /v1/openings?role=&q=&tag=` | public : rôles ouverts, avec leur projet |
| `GET /v1/openings/roles` | public : par rôle, annonces, places et projets (bande de l'accueil) |
| `GET /v1/openings/stacks?limit=` | public : par technologie des projets qui recrutent, annonces, places et projets, les plus demandées d'abord (accueil, « Se rencontrer ») |
| `POST /v1/projects/{id}/openings` | porteur du projet, mainteneurs, modérateurs |
| `PUT /v1/openings/{id}`, `PATCH /v1/openings/{id}/open?open=false`, `DELETE /v1/openings/{id}` | idem |

Un projet renvoie aussi son accroche, sa couverture (et sa miniature, son crédit), ses rôles ouverts et
son équipe (`ProjectResponse`).

## Chiffres de la communauté

`GET /v1/stats` (public) : développeurs, pays représentés, projets, rôles ouverts et places qu'ils
proposent, comptés en base à chaque demande (bannière finale de l'accueil).

## Médias

`src/main/resources/static/media` est servi sous `/api/media/**`, mis en cache un mois. Un chemin de
média enregistré en base (« media/demo/projects/x.webp ») devient une adresse complète sur l'hôte de la
requête (`common/MediaUrls.java`). Les couvertures de démonstration viennent de Wikimedia Commons :
auteurs et licences dans `static/media/demo/CREDITS.md`.
