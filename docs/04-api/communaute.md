# API — Communauté

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/ArticleController.java`, `CommentController.java`, `TagController.java`, `VoteController.java`, `FeedController.java`

## Endpoints principales

### Articles

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/articles` | Liste des articles | Public | `q`, `tag`, `language`, `author`, pageable | `PageResponse<ArticleSummaryResponse>` |
| `GET` | `/v1/articles/{slug}` | Détail d’un article | Public | `slug` | `ArticleResponse` |
| `GET` | `/v1/articles/me` | Mes articles | Authentifié | `status`, pageable | `PageResponse<ArticleSummaryResponse>` |
| `POST` | `/v1/articles` | Créer un article | Authentifié | `ArticleRequest` | `ArticleResponse` |
| `PUT` | `/v1/articles/{id}` | Modifier | Authentifié | `ArticleRequest` | `ArticleResponse` |
| `POST` | `/v1/articles/{id}/publish` | Publier un brouillon | Authentifié | `id` | `ArticleResponse` |
| `DELETE` | `/v1/articles/{id}` | Supprimer | Authentifié | `id` | `Void` |

### Commentaires

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/comments` | Liste des commentaires d’une cible | Public | `targetType`, `targetId`, pageable | `PageResponse<CommentResponse>` |
| `POST` | `/v1/comments` | Publier un commentaire | Authentifié | `CommentRequest` | `CommentResponse` |
| `PUT` | `/v1/comments/{id}` | Modifier un commentaire | Authentifié | `CommentUpdateRequest` | `CommentResponse` |
| `DELETE` | `/v1/comments/{id}` | Supprimer | Authentifié | `id` | `Void` |

### Tags

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/tags` | Tags, avec recherche | Public | `q`, pageable | `PageResponse<TagResponse>` |
| `GET` | `/v1/tags/{slug}` | Détail d’un tag | Public | `slug` | `TagResponse` |
| `POST` | `/v1/tags/{slug}/follow` | Suivre un tag | Authentifié | `slug` | `Void` |
| `DELETE` | `/v1/tags/{slug}/follow` | Ne plus suivre | Authentifié | `slug` | `Void` |

### Votes

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `POST` | `/v1/votes` | Voter +1 / -1 | Authentifié | `VoteRequest` | `VoteResponse` |
| `DELETE` | `/v1/votes` | Retirer son vote | Authentifié | `targetType`, `targetId` | `VoteResponse` |

### Fil d’actualité

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/feed` | Fil personnalisé / global | Public / Authentifié | `tag`, `country`, `language`, pageable | `PageResponse<FeedItemResponse>` |

## DTO principaux

- `ArticleRequest`
- `CommentRequest`
- `CommentUpdateRequest`
- `VoteRequest`
- `TagResponse`
- `FeedItemResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/ArticleController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/CommentController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/TagController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/VoteController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/FeedController.java`
