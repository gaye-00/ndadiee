# Déploiement et exploitation Ndadiée

Ce dossier documente le déploiement attendu du projet, à partir des éléments réellement présents dans le dépôt et sans affirmer de mise en ligne effective sur Datacloud ou ailleurs.

## État de la preuve

Les éléments vérifiés dans le dépôt :

- [docker-compose.yml](../../docker-compose.yml) fournit un service PostgreSQL local.
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml) décrit les variables Spring et les services d’intégration.
- [.env.example](../../.env.example) donne les variables de configuration de référence.
- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts) configure le backend front via `VITE_BACKEND_URL`.
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java) déclare les règles CORS et les permissions.

Les éléments non vérifiés :

- aucun fichier Dockerfile n’est présent dans le dépôt,
- aucune configuration de production Docker Compose / Traefik / Nginx / TLS n’est documentée,
- aucune preuve d’hébergement Datacloud ou URL publique n’est présente dans le dépôt,
- aucune procédure de déploiement automatisé n’est fournie.

L’[audit opérationnel](./etat-preparation-production.md), actualisé le 6 novembre 2026, confirme la réussite des contrôles frontend et des 313 tests backend sur PostgreSQL temporaire. JWT, seeders et mode JPA ont été durcis ; la migration initiale Flyway V1 et sa procédure de baseline ont été testées. La compatibilité avec la base cible, les parcours métier sur staging et les preuves de déploiement restent à établir ; aucun déploiement n’a été effectué.

## Architecture cible recommandée

Une architecture réaliste pour une mise en production est la suivante :

- un reverse proxy TLS (Nginx ou Traefik) devant le frontend,
- un conteneur backend Spring Boot exposé en interne uniquement au proxy,
- un conteneur PostgreSQL dédié,
- un système de stockage objet S3-compatible (Cloudflare R2) pour les médias,
- un service d’email SMTP ou un fournisseur externalisé,
- des variables d’environnement sécurisées et stockées hors dépôt.

## Documents de ce dossier

- [architecture-deploiement.md](./architecture-deploiement.md)
- [docker.md](./docker.md)
- [configuration-production.md](./configuration-production.md)
- [deploiement-backend.md](./deploiement-backend.md)
- [deploiement-frontend.md](./deploiement-frontend.md)
- [deploiement-postgresql.md](./deploiement-postgresql.md)
- [hebergement-datacloud.md](./hebergement-datacloud.md)
- [nom-de-domaine-et-https.md](./nom-de-domaine-et-https.md)
- [stockage-fichiers.md](./stockage-fichiers.md)
- [sauvegardes-restauration.md](./sauvegardes-restauration.md)
- [supervision-logs.md](./supervision-logs.md)
- [maintenance.md](./maintenance.md)
- [procedure-de-mise-en-production.md](./procedure-de-mise-en-production.md)
- [etat-preparation-production.md](./etat-preparation-production.md)

## Sommaire opérationnel

### 1. Préparation

- vérifier les variables dans [.env.example](../../.env.example),
- sécuriser `JWT_SECRET`,
- définir `FRONTEND_URL` et le domaine public,
- décider du mode de stockage des médias `STORAGE_PROVIDER`.

### 2. Infrastructure

- PostgreSQL dédié,
- backend et frontend en services séparés,
- proxy HTTPS et corrélation des ports internes/externes,
- règles de firewall / sécurité réseau.

### 3. Preuves à collecter avant validation

- URL publique de la plateforme,
- accès au backend via HTTPS,
- accès au frontend sans erreur,
- accès à la base depuis le service applicatif,
- test de création d’un compte et connexion,
- test d’upload d’image ou de fichier,
- capture de l’interface web et du Swagger.

## Limites de preuve

Aucune preuve d’hébergement réel n’étant présente dans le dépôt, ce document constitue une architecture de recommandation et de préparation de production, pas une attestation de déploiement existant.
