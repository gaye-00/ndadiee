# Authentification et autorisations

## JWT côté backend

[JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java) émet des jetons access et refresh distincts, signés par une clé HMAC chargée depuis `jwt.secret`. Le parseur vérifie signature, expiration et claim `type`. Les durées sont configurables dans [application.yaml](../../backend/src/main/resources/application.yaml).

[JwtAuthenticationFilter.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtAuthenticationFilter.java) lit le JWT dans `Authorization: Bearer …` sur les requêtes HTTP. Les comptes suspendus ne sont pas authentifiés par le filtre.

## Autorisations HTTP

[SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java) établit une application stateless. Les endpoints publics sont explicités, les opérations d'écriture exigent les permissions de l'utilisateur, et les autres routes demandent une authentification. Les contrôles fins de propriété sont réalisés dans les services et certains contrôleurs.

Les routes admin disposent de permissions dédiées ; [AdminSecurityTest.java](../../backend/src/test/java/com/hautetech/ndadiee/controller/AdminSecurityTest.java) teste visiteur, utilisateur, modérateur, administrateur, ainsi que l'insuffisance d'une seule barrière d'accès.

## Frontend

Les jetons sont sauvegardés dans `localStorage` par [storage.ts](../../frontend/src/utils/storage.ts). [api.ts](../../frontend/src/services/api.ts) ajoute le bearer token aux requêtes, et centralise le renouvellement en réponse aux erreurs 401. Les routes frontend protègent l'expérience utilisateur, mais ne remplacent pas les contrôles serveur.

## WebSocket

[StompAuthenticationInterceptor.java](../../backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java) valide l'access token de la trame STOMP `CONNECT`. Il limite ensuite `SUBSCRIBE` aux destinations `/user/queue/` et `SEND` à `/app/`.

## Éléments non vérifiés

- politique effective de secrets dans l'environnement de production ;
- rotation/révocation centralisée des JWT et comportement multi-instance ;
- test de bout en bout des règles d'accès sur l'ensemble des endpoints ;
- test de sécurité WebSocket en conditions de production.

Voir également [Gestion des secrets](./gestion-des-secrets.md) et [CORS et protections Web](./cors-et-protections-web.md).
