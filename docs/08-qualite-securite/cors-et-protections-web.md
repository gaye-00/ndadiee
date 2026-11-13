# CORS et protections Web

## CORS de l'API

[SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java) autorise l'origine configurée par `frontend.url` ainsi que le motif `http://localhost:*`, avec les méthodes et en-têtes autorisés par wildcard, credentials activés, et exposition de l'en-tête `Authorization`.

La configuration doit être adaptée au domaine réel. Le motif localhost facilite le développement local ; sa présence dans le bean ne prouve pas qu'une origine publique quelconque est autorisée, mais doit être retirée ou isolée du profil de production si elle n'est pas nécessaire.

## WebSocket

[WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java) applique les mêmes origines configurées à `/ws`. Le protocole est authentifié dans STOMP via [StompAuthenticationInterceptor.java](../../backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java).

## Autres protections visibles

- politique de session stateless et filtre JWT ;
- réponses d'erreurs normalisées sans renvoyer les détails génériques du serveur au client ;
- upload limité par taille, type d'image détecté et quota ;
- rendu Markdown sans interprétation de HTML brut, et protocole de lien limité dans [MarkdownContent.tsx](../../frontend/src/components/shared/MarkdownContent.tsx).

## À vérifier avant production

- origine(s) CORS exactes et absence de wildcard non intentionnel ;
- service servi uniquement en HTTPS et WebSocket via WSS ;
- en-têtes de sécurité HTTP (CSP, HSTS, `X-Content-Type-Options`, politique de frame) configurés par l'hôte/proxy ;
- politique de cache pour les réponses privées ;
- protections CSRF cohérentes avec la stratégie de stockage des tokens ;
- configuration des limites de requêtes et mécanismes anti-abus.

Le dépôt ne montre pas de configuration de reverse proxy/HTTPS complète. Aucune protection absente n'est déclarée comme vulnérabilité confirmée sans examen de la configuration d'hébergement.
