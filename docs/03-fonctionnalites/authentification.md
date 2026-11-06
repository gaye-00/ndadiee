# Authentification

Statut : Implémenté.

## Présentation

L’authentification de Ndadiée repose sur Spring Security et des JWT. Le flux est défini dans [backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java) et la configuration de sécurité dans [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java).

## Objectif

Permettre à un membre de créer un compte, se connecter, renouveler une session et accéder aux écrans et services protégés sans dépendre d’une session HTTP classique.

## Utilisateurs concernés

- visiteur non authentifié,
- développeur membre,
- administrateur.

## Fonctionnement

Le client appelle les endpoints d’authentification pour :

1. créer un compte développeur,
2. vérifier la disponibilité d’un nom d’utilisateur,
3. obtenir un access token et un refresh token,
4. récupérer le profil courant,
5. renouveler la session si le token expire.

Le backend charge l’utilisateur via `UserDetailsService`, vérifie le JWT dans le filtre `JwtAuthenticationFilter`, puis applique les permissions sur les routes du backend via `SecurityConfiguration`.

## Parcours utilisateur

- Le visiteur remplit le formulaire d’inscription.
- Il reçoit un compte de type `Developer` avec nom d’utilisateur unique.
- Il se connecte avec email ou username.
- Le frontend conserve le token et réutilise le refresh token pour obtenir un accès sans déconnexion.
- L’API protège les pages et endpoints selon le rôle et les permissions.

## Règles métier

- Le nom d’utilisateur est vérifié avant inscription.
- Le mot de passe et les champs requis sont validés au niveau des DTO.
- L’accès est refusé si le compte est bloqué ou si le JWT est invalide.
- Les routes d’administration sont limitées à des comptes portant la permission `ADMIN_*`.

## Permissions nécessaires

- public pour inscription, connexion et disponibilité d’username ;
- authentifié pour `/v1/auth/me` ;
- administrateur pour les routes `/v1/admin/**`.

## API associées

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/auth/username-availability`
- `GET /v1/auth/me`

## Composants frontend concernés

- [frontend/src/pages/auth/LoginPage.tsx](../../frontend/src/pages/auth/LoginPage.tsx)
- [frontend/src/pages/auth/RegisterPage.tsx](../../frontend/src/pages/auth/RegisterPage.tsx)
- [frontend/src/hooks/useAuth.ts](../../frontend/src/hooks/useAuth.ts)
- [frontend/src/store/useAuthStore.ts](../../frontend/src/store/useAuthStore.ts)
- [frontend/src/router/ProtectedRoute.tsx](../../frontend/src/router/ProtectedRoute.tsx)

## Entités et relations concernées

- `User`, `Developer`, `Role`, `Permission` dans [backend/src/main/java/com/hautetech/ndadiee/model/user](../../backend/src/main/java/com/hautetech/ndadiee/model/user)
- relations utilisateur/profil et autorisations
- besoin de rôle attribué en base et contrôlé dans la configuration Spring Security

## État d’implémentation

Implémenté.

## Limites connues

- le système ne présente pas de preuve de MFA ou d’authentification forte multi-facteur dans le dépôt ;
- la politique de révocation des refresh tokens n’est pas documentée comme un mécanisme distinct hors JWT standard.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
- [frontend/src/hooks/useAuth.ts](../../frontend/src/hooks/useAuth.ts)
