# Documentation des API Ndadiée

Cette section recense les endpoints REST et WebSocket réellement présents dans le backend de Ndadiée. Elle est fondée sur les contrôleurs Java du dépôt et non sur des spécifications abstraites.

## 1. Base applicative

- Contexte serveur : `/api` (`server.servlet.context-path`)
- Préfixe REST : `/v1`
- URL locale complète : `http://localhost:8080/api/v1/...`
- Authentification : JWT placé dans l’en-tête `Authorization` avec le schéma `Bearer ...`
- CORS : autorisé depuis `frontend.url` et `http://localhost:*` (voir `backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java`)
- Stateless : la session est désactivée (`SessionCreationPolicy.STATELESS`)
- Format de réponse standard : `ApiResponse<T>`

### `ApiResponse<T>`

```json
{
  "success": true,
  "message": "Exemple",
  "data": { }
}
```

Code source :
- `backend/src/main/java/com/hautetech/ndadiee/common/ApiResponse.java`

## 2. Sécurité et permissions

Les règles de protection sont définies dans :
- `backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java`
- `backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java`

En résumé :

- Public : inscription, connexion, refresh, lecture publique des contenus, recherche et tags
- Authentifié : écriture métier, profil, messagerie, workspace, notifications, etc.
- Admin : toutes les routes `/v1/admin/**` avec permissions `ADMIN_*`

## 3. Format des erreurs

Les erreurs de l’API utilisent `ErrorResponse` avec status, code, message, validationErrors et details lorsque disponibles.

```json
{
  "status": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Erreur de validation",
  "validationErrors": {
    "email": "doit être un email valide"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Code source :
- `backend/src/main/java/com/hautetech/ndadiee/exception/ErrorResponse.java`
- `backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java`

## 4. Contrôleurs REST principaux

- `AuthenticationController` — `/v1/auth`
- `UserController` — `/v1/users`
- `ProjectController` — `/v1/projects`
- `WorkspaceController` — `/v1/projects/{slug}/workspace`
- `QuestionController` — `/v1/questions`
- `ArticleController` — `/v1/articles`
- `CommentController` — `/v1/comments`
- `VoteController` — `/v1/votes`
- `TagController` — `/v1/tags`
- `FeedController` — `/v1/feed`
- `ReviewController` — `/v1/reviews`
- `PullRequestController` — `/v1/projects/{slug}/pull-requests/{number}`
- `HackathonController` — `/v1/hackathons`
- `ConversationController` — `/v1/conversations`
- `AdminController` — `/v1/admin`
- `GithubController` — `/v1/github`
- `NotificationController` — `/v1/notifications`
- `SearchController` — `/v1/search`

Contrôleurs spécialisés examinés mais non détaillés dans cette série de pages :
- `BadgeController` — `/v1/badges`
- `DashboardController` — `/v1/dashboard`
- `StatsController` — `/v1/stats`
- `OpportunityController` — `/v1/opportunities`
- `DevlogController` — `/v1/projects/{projectId}/devlog`
- `FeedbackController` — `/v1/projects/{projectId}/feedback-calls`
- `UploadController` — `/v1/uploads`

## 5. WebSocket

Le WebSocket de chat se connecte via STOMP sur `/ws` et utilise des destinations `/app/...` et `/user/queue/...`.

Doc détaillée : [websocket.md](websocket.md)

## 6. Documentation du domaine

- [authentification.md](authentification.md)
- [utilisateurs.md](utilisateurs.md)
- [projets.md](projets.md)
- [workspace.md](workspace.md)
- [communaute.md](communaute.md)
- [questions-reponses.md](questions-reponses.md)
- [reviews-pull-requests.md](reviews-pull-requests.md)
- [hackathons.md](hackathons.md)
- [conversations-messages.md](conversations-messages.md)
- [administration.md](administration.md)
- [github.md](github.md)
- [notifications.md](notifications.md)
- [websocket.md](websocket.md)
- [gestion-erreurs.md](gestion-erreurs.md)
- [conventions-api.md](conventions-api.md)

## 7. Limites de vérification

Les informations ci-dessous sont directement basées sur le code présent. Les éléments non documentés ou non vérifiables dans le dépôt sont signalés comme « À vérifier ».
