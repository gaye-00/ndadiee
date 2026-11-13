# API — Workspace / collaboration

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/projects/{slug}/workspace` | Vue d’ensemble du workspace | Authentifié | `slug` | `WorkspaceResponse` |
| `POST` | `/v1/projects/{slug}/workspace/pulse` | Indique la présence du membre | Authentifié | `slug` | `WorkspacePulseResponse` |
| `GET` | `/v1/projects/{slug}/workspace/tasks` | Tableau des tâches | Authentifié | `slug` | `List<TaskResponse>` |
| `GET` | `/v1/projects/{slug}/workspace/tasks/{number}` | Détail d’une tâche | Authentifié | `slug`, `number` | `TaskResponse` |
| `POST` | `/v1/projects/{slug}/workspace/tasks` | Créer une tâche | Authentifié | `TaskRequest` | `TaskResponse` |
| `PUT` | `/v1/projects/{slug}/workspace/tasks/{number}` | Modifier une tâche | Authentifié | `TaskRequest` | `TaskResponse` |
| `PUT` | `/v1/projects/{slug}/workspace/tasks/{number}/position` | Déplacer la tâche | Authentifié | `TaskMoveRequest` | `List<TaskResponse>` |
| `DELETE` | `/v1/projects/{slug}/workspace/tasks/{number}` | Supprimer une tâche | Authentifié | `slug`, `number` | `Void` |
| `GET` | `/v1/projects/{slug}/workspace/pull-requests` | PR liées | Authentifié | `slug` | `List<TaskPullRequestResponse>` |
| `POST` | `/v1/projects/{slug}/workspace/sprints` | Ouvrir un sprint | Authentifié | `SprintRequest` | `SprintResponse` |
| `POST` | `/v1/projects/{slug}/workspace/sprints/current/close` | Fermer le sprint | Authentifié | `slug` | `SprintResponse` |
| `GET` | `/v1/projects/{slug}/workspace/messages` | Discussion d’équipe | Authentifié | `before`, `size` | `TeamChatResponse` |
| `POST` | `/v1/projects/{slug}/workspace/messages` | Écrire dans le chat d’équipe | Authentifié | `TeamMessageRequest` | `TeamMessageResponse` |

## Règles métier

- Les opérations sont limitées à l’équipe du projet.
- Le tableau est géré par colonnes et positions.
- Le sprint en cours est clos par le porteur ou les mainteneurs.
- Les messages d’équipe sont associés au projet courant.

## DTO principaux

- `TaskRequest`
- `TaskMoveRequest`
- `SprintRequest`
- `TeamMessageRequest`
- `WorkspaceResponse`
- `TaskResponse`
- `SprintResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/workspace/WorkspaceService.java`
