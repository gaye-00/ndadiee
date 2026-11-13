# Projets

Statut : Implémenté.

## Présentation

La plateforme permet à un développeur de publier un projet, de montrer ses rôles, d’attirer des contributeurs et de gérer l’équipe autour d’une vision ou d’un dépôt public. Le cœur de cette fonctionnalité est dans le contrôleur et le service projet.

## Objectif

Créer une vitrine de projets collaboratifs, permettre le recrutement de contributeurs et gérer l’évolution interne des équipes.

## Utilisateurs concernés

- porteur de projet,
- mainteneurs et membres acceptés,
- contributeurs potentiels,
- visiteurs et utilisateurs connectés.

## Fonctionnement

La liste publique affiche les projets, les facettes (rôle, technologie, pays), et les projets ouverts à la contribution. Un projet peut être créé, modifié, supprimé, ou rattaché à une galerie de médias.

Les demandes de participation sont gérées par les services de projet avec validation de rôle et statut.

## Parcours utilisateur

- le porteur publie un projet avec slug, description, tags, galerie et rôles ouverts,
- les visiteurs consultent la page projet,
- un membre demande à rejoindre à partir d’un rôle ouvert,
- le porteur ou le mainteneur accepte ou refuse la candidature,
- l’équipe travaille ensuite dans l’espace d’équipe.

## Règles métier

- les slugs sont réservés pour `/facets` et `/new` ;
- les rôles ouverts et les candidatures sont contrôlés par le backend ;
- la suppression ou la modification d’un projet exige les droits du propriétaire ou des modérateurs ;
- le service centralise la publication d’un projet et de ses éléments associés pour éviter la persistance partielle.

## Permissions nécessaires

- public sur lecture de la liste, fiches et membres ;
- authentifié pour créer, modifier, rejoindre, ou quitter un projet.

## API associées

- `GET /v1/projects`
- `GET /v1/projects/facets`
- `GET /v1/projects/{slug}`
- `GET /v1/projects/{id}/members`
- `POST /v1/projects`
- `PUT /v1/projects/{id}`
- `DELETE /v1/projects/{id}`
- `POST /v1/projects/{id}/join`
- `DELETE /v1/projects/{id}/join`
- `PUT /v1/projects/{id}/members/me`
- `PATCH /v1/projects/{id}/members/{memberId}`
- `POST /v1/projects/{projectId}/openings`

## Composants frontend concernés

- [frontend/src/pages/projects/ProjectPage.tsx](../../frontend/src/pages/projects/ProjectPage.tsx)
- [frontend/src/pages/projects/NewProjectPage.tsx](../../frontend/src/pages/projects/NewProjectPage.tsx)
- [frontend/src/pages/projects/MyProjectsPage.tsx](../../frontend/src/pages/projects/MyProjectsPage.tsx)
- [frontend/src/pages/openings/OpeningsPage.tsx](../../frontend/src/pages/openings/OpeningsPage.tsx)

## Entités et relations concernées

- `Project`, `ProjectMember`, `ProjectOpening`, `ProjectMedia` dans [backend/src/main/java/com/hautetech/ndadiee/model/project](../../backend/src/main/java/com/hautetech/ndadiee/model/project)
- `Tag` pour les stacks
- `Developer` comme propriétaire ou membre
- `HackathonTeam` comme relation d’inscription évènementielle

## État d’implémentation

Implémenté.

## Limites connues

- la gestion de publication, médias et rôles est réelle, mais le dépôt ne contient pas de preuve de validation de production complète ni de migration de schéma sur environnement de service réel.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectService.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectPublishingService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectPublishingService.java)
- [frontend/src/router/paths.ts](../../frontend/src/router/paths.ts)
