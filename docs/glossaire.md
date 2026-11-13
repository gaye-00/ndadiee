# Glossaire Ndadiée

## API REST
Interface HTTP exposée par le backend Spring Boot. Les routes sont sous le préfixe `/api` via `server.servlet.context-path` dans [backend/src/main/resources/application.yaml](../backend/src/main/resources/application.yaml).

## JWT
Jeton d’authentification JSON Web Token utilisé pour sécuriser les requêtes authentifiées. La génération et la validation sont centralisées dans [backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java](../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java).

## Workspace
Espace collaboratif d’un projet regroupant tâches, sprint, discussion d’équipe et présence. La logique est exposée dans [backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java](../backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java).

## Project Opening
Annonce de recrutement d’un rôle dans un projet. La logique métier est gérée dans le package projet et le contrôleur associé.

## Pull Request / PR
Demande de fusion d’un dépôt GitHub. Le projet gère leur revue, validation et commentaires dans le module review.

## Member Status
Statut d’un membre dans un projet : en attente, accepté, refusé, etc. Voir les modèles de `ProjectMember` et `MemberStatus`.

## Seed
Données de démonstration chargées automatiquement au démarrage de l’application quand `ndadiee.seed.enabled` est activé dans la configuration.

## Back-office
Zone d’administration réservée aux comptes de type `ADMIN`, contrôlée par `@PreAuthorize("hasRole('ADMIN')")` dans [backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java](../backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java).

## Moderation
Masquage ou suppression de contenus, blocage de comptes, journal d’audit et prise de décision par l’administration.

## R2 / S3-compatible
Cloudflare R2, utilisé via AWS SDK S3 compatible, pour stocker les images et médias. Voir [backend/src/main/java/com/hautetech/ndadiee/storage](../backend/src/main/java/com/hautetech/ndadiee/storage).

## STOMP
Protocole de messagerie WebSocket utilisé pour la discussion temps réel et les notifications de présence. Voir [backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java](../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java).

## Route publique
Route accessible sans authentification, selon la politique définie dans [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java).

## Route protégée
Route exigeant un membre connecté, soit via JWT, soit via un compte validé par la plateforme.

## Profil public
Vue d’un développeur visible sans inscription, avec réputation, compétences, activité et projets.

## Représentation métier
Les modèles JPA dans `backend/src/main/java/com/hautetech/ndadiee/model` représentent les entités du domaine, telles que les projets, les questions, les hackathons et les tâches.
