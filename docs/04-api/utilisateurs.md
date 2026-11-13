# API — Utilisateurs

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/UserController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/users` | Annuaire de développeurs filtrable | Public | `q`, `country`, `skill`, `level`, `openToWork`, `pageable` | `PageResponse<UserSummaryResponse>` |
| `GET` | `/v1/users/{username}` | Profil public | Public | `username` path | `UserProfileResponse` |
| `GET` | `/v1/users/{username}/followers` | Abonnés | Public | `username`, pageable | `PageResponse<UserSummaryResponse>` |
| `GET` | `/v1/users/{username}/following` | Abonnements | Public | `username`, pageable | `PageResponse<UserSummaryResponse>` |
| `GET` | `/v1/users/{username}/projects` | Projets du membre | Public | `username`, pageable | `PageResponse<MemberProjectResponse>` |
| `GET` | `/v1/users/{username}/collaborators` | Collaborateurs | Public | `username` | `List<CollaboratorResponse>` |
| `GET` | `/v1/users/{username}/activity` | Activité sur 1 an | Public | `username` | `List<ContributionDayResponse>` |
| `PUT` | `/v1/users/me` | Met à jour le profil connecté | Authentifié | `UpdateProfileRequest` | `UserResponse` |
| `PUT` | `/v1/users/me/email-preferences` | Préférences e-mail | Authentifié | `EmailPreferencesRequest` | `UserResponse` |
| `PUT` | `/v1/users/me/avatar` | Remplace l’avatar | Authentifié | `MultipartFile` | `UserResponse` |
| `DELETE` | `/v1/users/me/avatar` | Retire l’avatar | Authentifié | — | `UserResponse` |
| `POST` | `/v1/users/{username}/follow` | Suit un compte | Authentifié | `username` path | `Void` |
| `DELETE` | `/v1/users/{username}/follow` | Arrête de suivre | Authentifié | `username` path | `Void` |

## Détails métier

- La recherche des profils accepte `q`, pays, skill, niveau et disponibilité `openToWork`.
- Les API publiques permettent la découverte de profils et de leur activité.
- Les actions de suivi sont réservées au membre connecté.
- Les avatars utilisent `MultipartFile` avec un maximum lié à la configuration de média.

## DTO principaux

- `UpdateProfileRequest`
- `EmailPreferencesRequest`
- `UserProfileResponse`
- `UserSummaryResponse`
- `MemberProjectResponse`
- `ContributionDayResponse`

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/UserController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/user/ProfileService.java`
