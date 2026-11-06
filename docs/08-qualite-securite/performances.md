# Performances

## Mécanismes présents dans la configuration et le code

- Hibernate utilise `default_batch_fetch_size: 50` dans [application.yaml](../../backend/src/main/resources/application.yaml) pour limiter certains chargements N+1.
- Pagination Spring configurée avec une taille par défaut de 20 et un maximum de 50 dans [application.yaml](../../backend/src/main/resources/application.yaml).
- Le client Axios fixe un timeout de 15 secondes : [api.ts](../../frontend/src/services/api.ts).
- Vite découpe les pages frontend à la demande via le routeur et ses imports lazy : [pages.ts](../../frontend/src/router/pages.ts).
- Les médias du frontend sont chargés paresseusement dans le rendu Markdown : [MarkdownContent.tsx](../../frontend/src/components/shared/MarkdownContent.tsx).
- Le transport WebSocket limite la taille de message, le buffer d'envoi et le temps d'envoi : [WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java).

## Limites

- Aucun test de charge, profilage ou mesure de latence n'a été exécuté.
- Le broker STOMP intégré est en mémoire ; la configuration le prévoit pour une instance unique.
- Les limites d'upload sont présentes, mais le quota par utilisateur est conservé en mémoire et ne se partage pas entre instances.
- Aucune observation réelle des coûts/quotas GitHub, base de données ou stockage n'est fournie.

## Recommandations

1. Mesurer latences API, taux d'erreurs, utilisation CPU/mémoire et requêtes lentes en staging.
2. Tester les parcours concurrents (recherche, flux, messagerie, synchronisation PR).
3. Établir des seuils de pagination, taille des payloads et temps maximal des tâches de fond.
4. Utiliser un broker partagé si plusieurs instances backend sont nécessaires.
5. Définir une stratégie de cache HTTP pour les contenus publics sans mettre en cache les réponses privées.

Les mécanismes listés sont des éléments de code, pas la preuve de performances satisfaisantes en production.
