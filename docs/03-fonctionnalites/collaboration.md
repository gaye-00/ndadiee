# Collaboration et espace d’équipe

Statut : Implémenté.

## Présentation

Ndadiée intègre un espace d’équipe dédié pour gérer un projet en mode collaboratif : tableau Kanban, pull requests liées à des tâches, sprints, messages d’équipe et suivi de l’activité.

## Objectif

Assurer la coordination interne d’un projet avec une vue de travail structurée, une discussion d’équipe et une période de livraison en sprint.

## Utilisateurs concernés

- propriétaire du projet,
- mainteneurs,
- membres acceptés,
- relecteurs ou contributeurs reliés à des tâches.

## Fonctionnement

Le contrôleur [backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java) expose :

- vue d’ensemble de l’espace,
- tableau des tâches par colonne,
- création / modification / déplacement / suppression des tâches,
- ouverture et fermeture de sprint,
- messages d’équipe,
- rendez-vous / discussions internes,
- liens avec les pull requests d’un projet.

## Parcours utilisateur

- l’équipe ouvre un sprint,
- les tâches sont créées dans le tableau,
- les membres déplacent les cartes entre colonnes,
- un sprint est clôturé et les tâches terminées sont livrées,
- les discussions de projet sont centralisées dans le chat de l’équipe.

## Règles métier

- les actions de workspace sont limitées aux membres et aux profils autorisés du projet,
- les tâches peuvent être liées à des pull requests de dépôt,
- la fermeture de sprint est réservée aux profils de pilotage (propriétaire / mainteneurs),
- les messages d’équipe et les événements sont créés dans le contexte du projet.

## Permissions nécessaires

- authentifié,
- membre de l’équipe ou personnel autorisé au projet.

## API associées

- `GET /v1/projects/{slug}/workspace`
- `POST /v1/projects/{slug}/workspace/pulse`
- `GET /v1/projects/{slug}/workspace/tasks`
- `GET /v1/projects/{slug}/workspace/tasks/{number}`
- `POST /v1/projects/{slug}/workspace/tasks`
- `PUT /v1/projects/{slug}/workspace/tasks/{number}`
- `PUT /v1/projects/{slug}/workspace/tasks/{number}/position`
- `DELETE /v1/projects/{slug}/workspace/tasks/{number}`
- `GET /v1/projects/{slug}/workspace/pull-requests`
- `POST /v1/projects/{slug}/workspace/sprints`
- `POST /v1/projects/{slug}/workspace/sprints/current/close`
- `GET /v1/projects/{slug}/workspace/messages`
- `POST /v1/projects/{slug}/workspace/messages`

## Composants frontend concernés

- [frontend/src/pages/workspace/WorkspaceBoardPage.tsx](../../frontend/src/pages/workspace/WorkspaceBoardPage.tsx)
- [frontend/src/pages/workspace/WorkspaceReviewsPage.tsx](../../frontend/src/pages/workspace/WorkspaceReviewsPage.tsx)
- [frontend/src/pages/workspace/WorkspaceRolesPage.tsx](../../frontend/src/pages/workspace/WorkspaceRolesPage.tsx)
- [frontend/src/pages/workspace/WorkspaceSettingsPage.tsx](../../frontend/src/pages/workspace/WorkspaceSettingsPage.tsx)
- [frontend/src/hooks/useWorkspace.ts](../../frontend/src/hooks/useWorkspace.ts)

## Entités et relations concernées

- `Task`, `Sprint`, `TeamMessage` dans [backend/src/main/java/com/hautetech/ndadiee/model/workspace](../../backend/src/main/java/com/hautetech/ndadiee/model/workspace)
- `Project` comme conteneur de l’espace d’équipe
- `ProjectMember` comme participant autorisé

## État d’implémentation

Implémenté.

## Limites connues

- le schéma détaillé du workspace est bien visible, mais la robustesse opérationnelle réelle de ce module dépend de l’usage complet en production et de la couverture fonctionnelle de ses cas limites.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/workspace/WorkspaceService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/WorkspaceService.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/workspace/TaskService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/TaskService.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/workspace/TeamChatService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/TeamChatService.java)
