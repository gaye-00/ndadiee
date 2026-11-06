# Ndadiée

Ndadiée est une plateforme communautaire destinée aux développeurs : découverte de projets et de profils, échanges techniques, collaboration d’équipe et revues de code. Le dépôt contient une application web composée d’un backend Spring Boot et d’un frontend React.

> **État du déploiement : non vérifié.** Le dépôt ne fournit pas d’URL publique ni de preuve d’hébergement Datacloud. Les commandes ci-dessous démarrent un environnement local ; elles ne constituent pas une procédure de production.

## Documentation

- [Index documentaire](docs/README.md)
- [Présentation générale](docs/01-presentation/presentation-generale.md)
- [Architecture](docs/02-architecture/diagrammes.md)
- [Fonctionnalités](docs/03-fonctionnalites/README.md)
- [Référence API](docs/04-api/README.md)
- [Développement et contribution](docs/06-developpement/README.md)
- [Déploiement et exploitation](docs/07-deploiement/README.md)
- [Qualité et sécurité](docs/08-qualite-securite/README.md)
- [Dossier de conformité CADEV 2026](docs/09-conformite-cadev/README.md)

Les guides utilisateur détaillés ne sont pas présents actuellement dans `docs/05-guides-utilisateur/`. Les parcours fonctionnels sont décrits dans la documentation des [fonctionnalités](docs/03-fonctionnalites/README.md).

## Technologies principales

| Composant | Technologies |
|---|---|
| Backend | Java 21, Spring Boot 4.1.1, Spring Security, Spring Data JPA, PostgreSQL, JWT, WebSocket/STOMP |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand |
| Fichiers | Stockage local en développement ou stockage compatible S3 / Cloudflare R2 selon la configuration |
| Base locale | PostgreSQL 17 via Docker Compose |

Les versions sont tirées de [backend/pom.xml](backend/pom.xml), [frontend/package.json](frontend/package.json) et [docker-compose.yml](docker-compose.yml).

## Prérequis

- Java 21
- Node.js `^20.19.0` ou `>=22.12.0` pour la version Vite 8 résolue dans l’installation vérifiée
- Docker avec Docker Compose

Voir le [guide des prérequis](docs/06-developpement/prerequis.md) pour les détails.

## Démarrage local

### 1. Base PostgreSQL

À la racine du dépôt :

```bash
docker compose up -d postgres
```

Le service PostgreSQL local expose le port `5434` sur `127.0.0.1`. Ses valeurs par défaut sont réservées au développement.

### 2. Backend

Dans un terminal :

```bash
cd backend
SPRING_PROFILES_ACTIVE=local JWT_SECRET="$(openssl rand -base64 48)" ./mvnw spring-boot:run
```

Le backend écoute par défaut sur `http://localhost:8080/api`.
Flyway applique automatiquement V1 sur une base vide. Si vous avez déjà une base locale existante sans historique Flyway, ne la supprimez pas : suivez la procédure de sauvegarde, comparaison et baseline de [Base de données](docs/06-developpement/base-de-donnees.md) avant le démarrage.

### 3. Frontend

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Le frontend Vite est disponible par défaut sur `http://localhost:5173` et utilise le backend local par défaut. Les variables de configuration sont décrites dans [.env.example](.env.example) et le [guide environnement](docs/06-developpement/configuration-environnement.md).

## Vérifications disponibles

```bash
# Backend
cd backend && ./mvnw test

# Frontend
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run i18n:check
```

La suite backend complète a besoin de PostgreSQL pour le test de démarrage. Aucun script de tests frontend n’est déclaré dans [frontend/package.json](frontend/package.json). Les résultats de vérification connus sont consignés dans [la stratégie de tests](docs/08-qualite-securite/strategie-de-tests.md).

## Limites importantes avant production

- Flyway applique les migrations versionnées ; Hibernate utilise `validate` dans tous les profils. Une base historique exige une baseline explicite après sauvegarde et comparaison à V1 avant usage.
- La clé JWT est obligatoire et validée au démarrage. Les seeders sont désactivés par défaut et ne peuvent être activés sans mots de passe explicites.
- Aucun Dockerfile pour le backend ou le frontend, manifeste de production ou preuve d’hébergement Datacloud n’a été trouvé dans le dépôt.
- Les licences transitives, l’usage historique de l’IA par l’équipe et l’URL publique doivent être confirmés séparément.

Voir la [checklist de production](docs/08-qualite-securite/checklist-production.md) et le [dossier CADEV](docs/09-conformite-cadev/README.md) avant toute présentation comme service en ligne.
