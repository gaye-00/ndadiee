# API — Authentification

Source : `backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java`

## Vue d’ensemble

Le module d’authentification expose des endpoints de création de compte, connexion, refresh et vérification de disponibilité d’un username.

## Endpoints

| Méthode | URL | Description | Auth | DTO / param | Réponse |
|---|---|---|---|---|---|
| `POST` | `/v1/auth/register` | Inscription d’un développeur | Public | `RegisterRequest` | `AuthenticationResponse` enveloppé dans `ApiResponse` |
| `POST` | `/v1/auth/login` | Connexion | Public | `AuthenticationRequest` | `AuthenticationResponse` |
| `POST` | `/v1/auth/refresh` | Renouvellement de session | Public | `RefreshTokenRequest` | `AuthenticationResponse` |
| `GET` | `/v1/auth/username-availability` | Vérifie si un username est libre | Public | `username` query param | `UsernameAvailabilityResponse` |
| `GET` | `/v1/auth/me` | Profil courant | Authentifié | — | `UserResponse` |

## Détails

### `POST /v1/auth/register`
- Corps requis : `RegisterRequest`
- Code HTTP : `201 Created`
- Principe : création du compte et retour d’un access token + refresh token
- Source : `AuthenticationController.register()`

### `POST /v1/auth/login`
- Corps requis : `AuthenticationRequest`
- Code HTTP : `200 OK`
- Principe : validation des identifiants et génération du couple de tokens

### `POST /v1/auth/refresh`
- Corps requis : `RefreshTokenRequest`
- Code HTTP : `200 OK`
- Principe : échange du refresh token contre un nouveau access token

### `GET /v1/auth/username-availability`
- Paramètre de requête : `username` (String)
- Code HTTP : `200 OK`
- Principe : détermine la disponibilité d’un identifiant

### `GET /v1/auth/me`
- Authentification : JWT valide dans l’en-tête `Authorization`
- Source : `AuthenticationController.me()`

## Sécurité

- Les routes auth sont autorisées en public dans `SecurityConfiguration`
- Le JWT est vérifié via `JwtAuthenticationFilter`
- Les comptes suspendus ne peuvent pas se connecter (gestion de `AccountBlockedException`)

## Réponse standard

L’API retourne des réponses enveloppées par `ApiResponse.success(...)`.
