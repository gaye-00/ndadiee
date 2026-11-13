# API — Questions et réponses

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/QuestionController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/questions` | Liste des sujets | Public | `q`, `tag`, `status`, `author`, `unanswered`, `solved`, `period`, `following`, pageable | `PageResponse<QuestionSummaryResponse>` |
| `GET` | `/v1/questions/overview` | Vue d’ensemble du forum | Public | — | `ForumOverviewResponse` |
| `GET` | `/v1/questions/{slug}` | Détail d’une question | Public | `slug` | `QuestionResponse` |
| `GET` | `/v1/questions/{id}/answers` | Réponses liées | Public | `id`, pageable | `PageResponse<AnswerResponse>` |
| `GET` | `/v1/questions/saved` | Sujets enregistrés | Authentifié | pageable | `PageResponse<QuestionSummaryResponse>` |
| `POST` | `/v1/questions/{id}/bookmark` | Enregistrer un sujet | Authentifié | `id` | `BookmarkResponse` |
| `DELETE` | `/v1/questions/{id}/bookmark` | Retirer un sujet | Authentifié | `id` | `BookmarkResponse` |
| `POST` | `/v1/questions` | Créer une question | Authentifié | `QuestionRequest` | `QuestionResponse` |
| `PUT` | `/v1/questions/{id}` | Modifier une question | Authentifié | `QuestionRequest` | `QuestionResponse` |
| `PATCH` | `/v1/questions/{id}/status` | Fermer / rouvrir | Authentifié | `status` query param | `QuestionResponse` |
| `DELETE` | `/v1/questions/{id}` | Supprimer une question | Authentifié | `id` | `Void` |

## DTO principaux

- `QuestionRequest`
- `AnswerRequest`
- `QuestionResponse`
- `AnswerResponse`
- `BookmarkResponse`

## Règles métier

- Les questions peuvent être fermées ou rouvertes selon leur statut.
- La liste sauvegardée est personnelle.
- `QuestionPeriod` permet de filtrer par période.
- Les réponses sont ordonnées de manière logique côté service (réponse acceptée puis meilleures notes).

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/QuestionController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/content/QuestionService.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/content/AnswerService.java`
