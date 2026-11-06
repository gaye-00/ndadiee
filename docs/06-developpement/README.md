# Guide du développeur Ndadiée

Ce dossier rassemble les consignes de mise en route, de configuration et de contribution pour les personnes qui souhaitent travailler sur Ndadiée en local ou préparer une évolution du projet.

## Objectif

Le dépôt contient :

- un backend Java 21 avec Spring Boot 4.1.1,
- un frontend React 19 + TypeScript + Vite,
- une base PostgreSQL pilotée par Docker Compose,
- des services de sécurité, de messagerie temps réel et d’intégration GitHub / stockage S3-compatible.

La documentation ci-dessous est fondée sur les fichiers réellement présents dans le dépôt, notamment :

- [backend/pom.xml](../../backend/pom.xml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [frontend/package.json](../../frontend/package.json)
- [docker-compose.yml](../../docker-compose.yml)
- [.env.example](../../.env.example)

## Accès rapide

- [Prérequis](./prerequis.md)
- [Installation locale](./installation-locale.md)
- [Configuration de l’environnement](./configuration-environnement.md)
- [Structure du projet](./structure-du-projet.md)
- [Démarrage du backend](./demarrage-backend.md)
- [Démarrage du frontend](./demarrage-frontend.md)
- [Base de données](./base-de-donnees.md)
- [Conventions de code](./conventions-de-code.md)
- [Gestion des dépendances](./gestion-des-dependances.md)
- [Tests automatisés](./tests-automatises.md)
- [Guide de contribution](./guide-contribution.md)
- [Workflow Git](./workflow-git.md)
- [Dépannage](./depannage.md)

## Démarrage rapide

```bash
# 1) Base PostgreSQL locale
cd /path/to/ndadiee
docker compose up -d postgres

# 2) Backend — configurer une clé JWT locale générée
cd backend
SPRING_PROFILES_ACTIVE=local JWT_SECRET="$(openssl rand -base64 48)" ./mvnw spring-boot:run

# 3) Frontend
cd ../frontend
npm install
npm run dev
```

Les ports attendus par le dépôt sont :

- base PostgreSQL : `localhost:5434` via Docker,
- backend : `http://localhost:8080/api`,
- frontend : `http://localhost:5173`.

## Points de vigilance

- Flyway applique les migrations versionnées, y compris V1, avant validation Hibernate (`ddl-auto=validate` dans tous les profils).
- Les bases historiques doivent être sauvegardées, comparées au schéma V1 puis explicitement baselinées en version 1 ; aucune baseline automatique n'est activée.
- La clé JWT est obligatoire, validée au démarrage et ne possède plus de valeur de repli.
- Les seeders sont désactivés par défaut ; leur activation locale exige `SEED_ENABLED=true` et les mots de passe configurés.
- La configuration de production et les secrets doivent être gérés hors dépôt via variables d’environnement sécurisées.
- Certaines intégrations (GitHub, Cloudflare R2, SMTP) sont prêtes à l’emploi au niveau de la configuration, mais leur activation réelle dépend de variables d’environnement non exposées dans le dépôt.

## Sources de référence

- [backend/README.md](../../backend/README.md)
- [frontend/README.md](../../frontend/README.md)
- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [frontend/package.json](../../frontend/package.json)
