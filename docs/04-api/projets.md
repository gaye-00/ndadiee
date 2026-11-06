# API — Projets

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/projects` | Vitrine des projets | Public | `q`, `tag`, `lookingForContributors`, `owner`, `role`, `country`, `pageable` | `PageResponse<ProjectResponse>` |
| `GET` | `/v1/projects/facets` | Facettes de la vitrine | Public | même filtres que ci-dessus | `ProjectFacetsResponse` |
| `GET` | `/v1/projects/{slug}` | Détail d’un projet | Public | `slug` | `ProjectResponse` |
| `GET` | `/v1/projects/{id}/members` | Membres d’un projet | Public ou connecté selon contexte | `id` | `List<ProjectMemberResponse>` |
| `POST` | `/v1/projects` | Créer un projet | Authentifié | `NewProjectRequest` | `ProjectResponse` |
| `PUT` | `/v1/projects/{id}` | Modifier un projet | Authentifié | `ProjectRequest` | `ProjectResponse` |
| `DELETE` | `/v1/projects/{id}` | Supprimer un projet | Authentifié | `id` | `Void` |
| `POST` | `/v1/projects/{id}/join` | Candidature | Authentifié | `JoinProjectRequest` | `ProjectMemberResponse` |
| `DELETE` | `/v1/projects/{id}/join` | Quitter / annuler | Authentifié | `id` | `Void` |
| `PUT` | `/v1/projects/{id}/members/me` | Définir son rôle | Authentifié | `MemberSpecialtyRequest` | `ProjectMemberResponse` |
| `POST` | `/v1/projects/{id}/media` | Ajouter une image de galerie | Authentifié | `ProjectMediaRequest` | `ProjectMediaResponse` |
| `DELETE` | `/v1/projects/{id}/media/{mediaId}` | Supprimer une image | Authentifié | `id`, `mediaId` | `Void` |
| `PUT` | `/v1/projects/{id}/members/{memberId}` | Valider ou refuser une candidature | Authentifié | `MemberDecisionRequest` | `ProjectMemberResponse` |
| `DELETE` | `/v1/projects/{id}/members/{memberId}` | Retirer un membre | Authentifié | `id`, `memberId` | `Void` |
| `PATCH` | `/v1/projects/{id}/settings` | Réglages du projet | Authentifié | `ProjectSettingsRequest` | `ProjectResponse` |

## Règles métier

- Le `slug` sert d’identifiant public de projet.
- Les candidatures visent un `openingId` et peuvent comprendre un message de motivation.
- La suppression et les décisions de candidature sont contrôlées par le porteur / mainteneurs / modérateurs.
- L’API crée le projet, ses rôles et sa galerie dans une transaction simple côté service.

## DTO principaux

- `NewProjectRequest`
- `ProjectRequest`
- `JoinProjectRequest`
- `MemberSpecialtyRequest`
- `MemberDecisionRequest`
- `ProjectMediaRequest`
- `ProjectSettingsRequest`
- `ProjectResponse`
- `ProjectMemberResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectService.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectPublishingService.java`
