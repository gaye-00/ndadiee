# API — Administration

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/admin/overview` | Vue d’ensemble | Admin | — | `AdminOverviewResponse` |
| `GET` | `/v1/admin/users` | Comptes | Admin | `q`, `role`, `status`, pageable | `PageResponse<AdminUserResponse>` |
| `POST` | `/v1/admin/users/{id}/block` | Suspendre un compte | Admin | `ModerationReasonRequest` | `AdminUserResponse` |
| `POST` | `/v1/admin/users/{id}/unblock` | Réactiver un compte | Admin | `id` | `AdminUserResponse` |
| `PATCH` | `/v1/admin/users/{id}/role` | Changer le rôle | Admin | `ChangeRoleRequest` | `AdminUserResponse` |
| `GET` | `/v1/admin/content` | Contenus modérés | Admin | `type`, `q`, `visibility`, pageable | `PageResponse<AdminContentResponse>` |
| `POST` | `/v1/admin/content/{type}/{id}/hide` | Masquer un contenu | Admin | `ModerationReasonRequest` | `AdminContentResponse` |
| `POST` | `/v1/admin/content/{type}/{id}/unhide` | Rétablir un contenu | Admin | `type`, `id` | `AdminContentResponse` |
| `DELETE` | `/v1/admin/content/{type}/{id}` | Supprimer un contenu | Admin | `type`, `id`, `reason` | `Void` |
| `GET` | `/v1/admin/actions` | Journal d’administration | Admin | `type`, pageable | `PageResponse<AdminActionResponse>` |

## Sécurité

- Route protégée par `@PreAuthorize("hasRole('ADMIN')")`
- Des.rules d’URL de `SecurityConfiguration` imposent aussi les permissions `ADMIN_*`
- L’api est conçue pour empêcher la modification par un compte non admin

## DTO principaux

- `ModerationReasonRequest`
- `ChangeRoleRequest`
- `AdminUserResponse`
- `AdminContentResponse`
- `AdminActionResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java`
- `backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java`
