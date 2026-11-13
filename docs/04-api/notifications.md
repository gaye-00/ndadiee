# API — Notifications

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/notifications` | Mes notifications | Authentifié | pageable | `PageResponse<NotificationResponse>` |
| `GET` | `/v1/notifications/unread-count` | Nombre non lu | Authentifié | — | `Long` |
| `PUT` | `/v1/notifications/{id}/read` | Marquer une notification comme lue | Authentifié | `id` | `NotificationResponse` |
| `PUT` | `/v1/notifications/read-all` | Marquer toutes les notifications lues | Authentifié | — | `Integer` |

## DTO principaux

- `NotificationResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/notification/NotificationService.java`
