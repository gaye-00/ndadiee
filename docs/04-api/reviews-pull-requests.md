# API — Revues de code et pull requests

Sources :
- `backend/src/main/java/com/hautetech/ndadiee/controller/ReviewController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java`

## Revues

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/reviews` | Liste des PR selon un onglet | Authentifié | `tab`, `q`, `project`, pageable | `PageResponse<PullRequestResponse>` |
| `GET` | `/v1/reviews/overview` | Bilan des revues | Authentifié | — | `ReviewOverviewResponse` |
| `POST` | `/v1/reviews/{id}/claim` | Prendre une PR en charge | Authentifié | `id` | `PullRequestResponse` |
| `DELETE` | `/v1/reviews/{id}/claim` | Libérer une PR | Authentifié | `id` | `PullRequestResponse` |

## Détail d’une PR

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/projects/{slug}/pull-requests/{number}` | Détail | Authentifié | `slug`, `number` | `PullRequestDetailResponse` |
| `GET` | `/v1/projects/{slug}/pull-requests/{number}/files` | Fichiers modifiés | Authentifié | `slug`, `number` | `PullRequestFilesResponse` |
| `GET` | `/v1/projects/{slug}/pull-requests/{number}/checks` | Vérifications CI | Authentifié | `slug`, `number` | `PullRequestChecksResponse` |
| `GET` | `/v1/projects/{slug}/pull-requests/{number}/issues` | Issues liées | Authentifié | `slug`, `number` | `List<LinkedIssueResponse>` |
| `POST` | `/v1/projects/{slug}/pull-requests/{number}/comments` | Commenter | Authentifié | `ReviewCommentRequest` | `ReviewCommentResponse` |
| `PATCH` | `/v1/projects/{slug}/pull-requests/{number}/comments/{commentId}` | Modifier commentaire | Authentifié | `ReviewCommentUpdateRequest` | `ReviewCommentResponse` |
| `DELETE` | `/v1/projects/{slug}/pull-requests/{number}/comments/{commentId}` | Supprimer commentaire | Authentifié | `slug`, `number`, `commentId` | `Void` |
| `POST` | `/v1/projects/{slug}/pull-requests/{number}/reviews` | Rendre une revue | Authentifié | `ReviewSubmitRequest` | `PullRequestDetailResponse` |
| `PUT` | `/v1/projects/{slug}/pull-requests/{number}/reviewers/{reviewerId}/helpful` | Juger utile | Authentifié | `slug`, `number`, `reviewerId` | `PullRequestDetailResponse` |
| `DELETE` | `/v1/projects/{slug}/pull-requests/{number}/reviewers/{reviewerId}/helpful` | Retirer la note utile | Authentifié | `slug`, `number`, `reviewerId` | `PullRequestDetailResponse` |

## Synchronisation GitHub

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/projects/{slug}/repository-sync` | Statut de sync | Authentifié | `slug` | `RepositorySyncResponse` |
| `POST` | `/v1/projects/{slug}/repository-sync` | Lancer une sync | Authentifié | `slug` | `RepositorySyncResponse` |

## DTO principaux

- `ReviewCommentRequest`
- `ReviewCommentUpdateRequest`
- `ReviewSubmitRequest`
- `PullRequestDetailResponse`
- `PullRequestFilesResponse`
- `PullRequestChecksResponse`
- `RepositorySyncResponse`

## Règles métier

- Les revues se font via `ReviewTab` (ex. `TO_REVIEW`, `MY_TEAM`, etc.).
- La prise en charge d’une revue est un workflow d’assignation avec libération possible.
- Les commentaires peuvent porter sur la conversation ou sur une ligne du diff.
- Le jugement utile rapporte une réputation au relecteur.
