# Messagerie privée

Statut : Implémenté.

## Présentation

La messagerie privée est un module de conversations directes entre développeurs, avec lecture asynchrone, marquage comme lu, notifications de message et synchronisation temps réel via WebSocket.

## Objectif

Permettre des échanges directs entre utilisateurs sans sortir du contexte de la communauté et de la collaboration.

## Utilisateurs concernés

- membres connectés,
- utilisateurs publics pour les profils,
- systèmes temps réel via WebSocket.

## Fonctionnement

La conversation est ouverte par username, créée si nécessaire, et les messages sont lus par tranche. L’API gère :

- liste des conversations,
- compteur de non lus,
- ouverture d’une conversation,
- pagination des messages,
- envoi, édition, suppression,
- marquage comme lu.

Le WebSocket diffuse les changements immédiatement aux destinataires.

## Parcours utilisateur

- un développeur ouvre une conversation avec un autre membre,
- il envoie un message avec un `clientId` pour éviter les doublons,
- la conversation est mise à jour dans la liste,
- le destinataire reçoit le message en temps réel,
- le message peut être supprimé ou modifié après publication.

## Règles métier

- une conversation est identifiée par une clé de jointure calculée à partir des deux participants,
- l’envoi est refusé si le destinataire ne peut plus recevoir de messages,
- les messages replayés avec le même `clientId` ne sont pas dupliqués,
- un membre ne peut consulter que ses propres conversations.

## Permissions nécessaires

- authentifié pour toutes les opérations.

## API associées

- `GET /v1/conversations`
- `GET /v1/conversations/unread-count`
- `POST /v1/conversations`
- `GET /v1/conversations/{id}`
- `GET /v1/conversations/{id}/messages`
- `POST /v1/conversations/{id}/messages`
- `PATCH /v1/conversations/{id}/messages/{messageId}`
- `DELETE /v1/conversations/{id}/messages/{messageId}`
- `PUT /v1/conversations/{id}/read`

## Composants frontend concernés

- [frontend/src/pages/messages/MessagesPage.tsx](../../frontend/src/pages/messages/MessagesPage.tsx)
- [frontend/src/hooks/useMessages.ts](../../frontend/src/hooks/useMessages.ts)
- [frontend/src/lib/chatSocket.ts](../../frontend/src/lib/chatSocket.ts)

## Entités et relations concernées

- `Conversation`, `ConversationParticipant`, `Message` dans [backend/src/main/java/com/hautetech/ndadiee/model/message](../../backend/src/main/java/com/hautetech/ndadiee/model/message)
- relation avec `Developer` comme expéditeur et destinataire

## État d’implémentation

Implémenté.

## Limites connues

- le module est bien présent et temps réel, mais il ne couvre pas d’éléments de groupe ou d’historique multi-salon sans un ajout fonctionnel supplémentaire.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/ConversationController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ConversationController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/message/MessageService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/message/MessageService.java)
- [backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java)
- [frontend/src/lib/chatSocket.ts](../../frontend/src/lib/chatSocket.ts)
