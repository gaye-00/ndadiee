# API — Conversations et messages

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/ConversationController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/conversations` | Mes conversations | Authentifié | pageable | `PageResponse<ConversationResponse>` |
| `GET` | `/v1/conversations/unread-count` | Nombre de messages non lus | Authentifié | — | `Long` |
| `POST` | `/v1/conversations` | Ouvrir / créer une conversation | Authentifié | `StartConversationRequest` | `ConversationResponse` |
| `GET` | `/v1/conversations/{id}` | Détail d’une conversation | Authentifié | `id` | `ConversationResponse` |
| `GET` | `/v1/conversations/{id}/messages` | Messages d’une conversation | Authentifié | `before`, `size` | `MessageSliceResponse` |
| `POST` | `/v1/conversations/{id}/messages` | Envoyer un message | Authentifié | `MessageRequest` | `MessageResponse` |
| `PATCH` | `/v1/conversations/{id}/messages/{messageId}` | Modifier un message | Authentifié | `MessageUpdateRequest` | `MessageResponse` |
| `DELETE` | `/v1/conversations/{id}/messages/{messageId}` | Supprimer un message | Authentifié | `id`, `messageId` | `Void` |
| `PUT` | `/v1/conversations/{id}/read` | Marquer comme lu | Authentifié | `id` | `Long` |

## DTO principaux

- `StartConversationRequest`
- `MessageRequest`
- `MessageUpdateRequest`
- `ConversationResponse`
- `MessageResponse`
- `MessageSliceResponse`

## Règles métier

- Les messages privés sont associés à un `Developer` expéditeur/destinataire.
- Le `clientId` est utilisé pour éviter les doublons dans l’envoi de messages.
- L’API gère aussi les conversations lues/non lues.

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/ConversationController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/message/MessageService.java`
