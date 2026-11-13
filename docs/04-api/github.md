# API — GitHub

Sources :
- `backend/src/main/java/com/hautetech/ndadiee/controller/GithubController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/github/repositories/{owner}/{name}` | Lit un dépôt public GitHub | Authentifié | `owner`, `name` | `GithubRepositoryResponse` |
| `GET` | `/v1/github/me/repositories` | Dépôts récents du membre | Authentifié | — | `List<GithubRepositorySummaryResponse>` |
| `GET` | `/v1/projects/{slug}/repository-sync` | Statut de sync GitHub | Authentifié | `slug` | `RepositorySyncResponse` |
| `POST` | `/v1/projects/{slug}/repository-sync` | Lancer une synchronisation | Authentifié | `slug` | `RepositorySyncResponse` |

## Règles métier

- La lecture est orientée vers l’import d’un dépôt public pour préremplir un projet.
- Les données GitHub servent ensuite au détail de projet et à la revue de code.
- La synchronisation de PR est gérée dans la couche `PullRequestSyncService`.

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/GithubController.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/github/GithubRepositoryService.java`
