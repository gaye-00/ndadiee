# Profils utilisateurs

Statut : Implémenté.

## Présentation

La plateforme met en avant les profils de développeurs et la construction d’une réputation sociale et technique. Cette dimension est exposée dans le contrôleur utilisateur et le service de profil.

## Objectif

Permettre à chaque membre de présenter sa compétence, son activité, ses contributions, ses compétences, son réseau et son niveau d’ouverture au travail.

## Utilisateurs concernés

- développeurs,
- visiteurs en lecture publique,
- administrateurs en modération.

## Fonctionnement

Le profil public contient :

- username et information biographique,
- localisation, langue, links GitHub / LinkedIn / site,
- compétences sous forme de tags,
- activité de contribution,
- badges,
- statistiques (questions, réponses, articles, projets, retours utiles, hackathons).

Le service [backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java) calcule les comptes et le profil public diffusé par `UserController`.

## Parcours utilisateur

- un membre met à jour son profil,
- il choisit ses skills, son niveau, son pays, sa ville, son `openToWork`,
- il peut suivre d’autres utilisateurs,
- le public peut consulter la page de profil, les followers, le following et les projets associés.

## Règles métier

- l’utilisateur ne peut pas se suivre lui-même,
- certaines statistiques excluent les contenus masqués par l’administration,
- l’avatar peut être remplacé et supprimé,
- les préférences e-mail sont gérées séparément.

## Permissions nécessaires

- public sur lecture du profil, followers, following, collaborators, activity et projets d’un profil ;
- authentifié pour mise à jour du profil, abonnement et avatar.

## API associées

- `GET /v1/users`
- `GET /v1/users/{username}`
- `GET /v1/users/{username}/followers`
- `GET /v1/users/{username}/following`
- `GET /v1/users/{username}/projects`
- `GET /v1/users/{username}/collaborators`
- `GET /v1/users/{username}/activity`
- `PUT /v1/users/me`
- `PUT /v1/users/me/email-preferences`
- `PUT /v1/users/me/avatar`
- `DELETE /v1/users/me/avatar`
- `POST /v1/users/{username}/follow`
- `DELETE /v1/users/{username}/follow`

## Composants frontend concernés

- [frontend/src/pages/profile/ProfilePage.tsx](../../frontend/src/pages/profile/ProfilePage.tsx)
- [frontend/src/hooks/useUsers.ts](../../frontend/src/hooks/useUsers.ts)
- [frontend/src/hooks/useAuth.ts](../../frontend/src/hooks/useAuth.ts)

## Entités et relations concernées

- `Developer` et `User` dans [backend/src/main/java/com/hautetech/ndadiee/model/user](../../backend/src/main/java/com/hautetech/ndadiee/model/user)
- `Tag` pour les compétences
- `UserBadge`, `Badge` pour la réputation visuelle
- relations de suivi dans le modèle utilisateur

## État d’implémentation

Implémenté.

## Limites connues

- la qualité des badges et de la réputation dépend de la logique métier et des événements de contributions ; la plate-forme montre la mécanique, mais la complétude du système de récompense reste à évaluer par les tests et les usages réels.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/UserController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/UserController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java)
- [frontend/src/pages/profile/ProfilePage.tsx](../../frontend/src/pages/profile/ProfilePage.tsx)
