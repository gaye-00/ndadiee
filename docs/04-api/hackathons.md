# API — Hackathons

Source : `backend/src/main/java/com/hautetech/ndadiee/controller/HackathonController.java`

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `GET` | `/v1/hackathons` | Liste des hackathons | Public | `status`, `q`, `tag`, pageable | `PageResponse<HackathonResponse>` |
| `GET` | `/v1/hackathons/{slug}` | Détail d’un hackathon | Public | `slug` | `HackathonResponse` |
| `GET` | `/v1/hackathons/{id}/teams` | Équipes inscrites | Public | `id` | `List<HackathonTeamResponse>` |
| `GET` | `/v1/hackathons/me` | Hackathons du membre | Authentifié | — | `List<HackathonResponse>` |
| `POST` | `/v1/hackathons/{id}/teams` | Inscrire une équipe | Authentifié | `HackathonTeamRequest` | `HackathonTeamResponse` |
| `DELETE` | `/v1/hackathons/{id}/teams/{projectId}` | Retirer une équipe | Authentifié | `id`, `projectId` | `Void` |
| `POST` | `/v1/hackathons` | Créer un hackathon | Authentifié / modération | `HackathonRequest` | `HackathonResponse` |
| `PUT` | `/v1/hackathons/{id}` | Modifier | Authentifié / modération | `HackathonRequest` | `HackathonResponse` |
| `DELETE` | `/v1/hackathons/{id}` | Supprimer | Authentifié / modération | `id` | `Void` |
| `PUT` | `/v1/hackathons/{id}/teams/{projectId}/result` | Attribuer un classement | Authentifié / modération | `HackathonResultRequest` | `HackathonTeamResponse` |

## DTO principaux

- `HackathonRequest`
- `HackathonTeamRequest`
- `HackathonResultRequest`
- `HackathonResponse`
- `HackathonTeamResponse`

## Règles métier

- Les équipes sont liées à un `Project`.
- Les résultats ne sont donnés qu’après la clôture de l’événement.
- L’inscription est réservée avant la fermeture des inscriptions.

## Source

- `backend/src/main/java/com/hautetech/ndadiee/controller/HackathonController.java`
- `backend/src/main/java/com/hautetech/ndadiee/service/hackathon/HackathonService.java`
