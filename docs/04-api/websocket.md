# API — WebSocket

Sources :
- `backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java`
- `backend/src/main/java/com/hautetech/ndadiee/controller/ChatSocketController.java`
- `backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java`

## 1. Endpoint de connexion

- Path STOMP : `/ws`
- Protocole : STOMP
- Broker : simple broker mémoire
- Destinations applicatives : `/app`
- Destinations utilisateurs : `/user`

## 2. Authentification WebSocket

Le JWT est envoyé dans le header HTTP `Authorization` de la trame STOMP CONNECT.

Contrôle :
- `CONNECT` : token JWT valide + compte non suspendu
- `SUBSCRIBE` : uniquement sur `/user/queue/**`
- `SEND` : uniquement sur `/app/**`

En cas d’échec, la connexion échoue avec `UNAUTHORIZED` ou `FORBIDDEN_DESTINATION`.

## 3. Destinations réelles

### Client vers serveur

| Destinations | Rôle |
|---|---|
| `/app/conversations/{conversationId}/typing` | Signal de saisie en cours |

### Serveur vers client

| Destinations | Rôle |
|---|---|
| `/user/queue/chat` | Événements de chat et de présence |

## 4. Message de saisie

Le payload utilisé est un record interne : `TypingRequest(boolean typing)`.

```json
{ "typing": true }
```

## 5. Flux réel

- Le client envoie un message via REST sur `/v1/conversations/{id}/messages`
- Le backend enregistre le message
- Le WebSocket annonce ensuite la mise à jour aux destinataires
- Les conversations et le fil de discussion utilisent les mêmes mécanismes de sécurisation

## 6. Limite de vérification

Le dépôt documente bien le mécanisme de chat WebSocket, mais les messages envoi/réception détaillés pour chaque événement côté front ne sont pas tous explicitement matérialisés dans le code visible de cette couche. Les événements exacts du chat sont donc à vérifier dans le client dépendant.
