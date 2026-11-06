# Notifications

Statut : Implémenté.

## Présentation

La plateforme inclut une couche de notifications qui centralise les événements apte à alerter un membre sur son activité, ses projets, ses revues, ses abonnements ou ses interactions.

## Objectif

Rester informé des événements importants sans devoir recharger le système ou consulter chaque espace manuellement.

## Utilisateurs concernés

- membres connectés,
- administrateurs,
- entités système générant des événements de communauté.

## Fonctionnement

Le contrôleur [backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java) expose la liste des notifications, le nombre de notifications non lues et la logique de lecture. Les notifications sont traitées dans les services et par des listeners lorsque des actions métier se produisent.

## Parcours utilisateur

- un contenu est publié, une mention ou une activité est enregistrée,
- la notification est créée,
- le membre la retrouve dans son centre de notifications,
- il peut la marquer comme lue ou les lire toutes d’un coup.

## Règles métier

- la lecture d’une notification est individuelle,
- la liste est triée par date de création,
- le compteur de notifications non lues est calculé séparément.

## Permissions nécessaires

- authentifié.

## API associées

- `GET /v1/notifications`
- `GET /v1/notifications/unread-count`
- `PUT /v1/notifications/{id}/read`
- `PUT /v1/notifications/read-all`

## Composants frontend concernés

- [frontend/src/pages/notifications/NotificationsPage.tsx](../../frontend/src/pages/notifications/NotificationsPage.tsx)
- [frontend/src/hooks/useNotifications.ts](../../frontend/src/hooks/useNotifications.ts)

## Entités et relations concernées

- `Notification` dans [backend/src/main/java/com/hautetech/ndadiee/model/notification](../../backend/src/main/java/com/hautetech/ndadiee/model/notification)
- relation avec `Developer` / utilisateur destinataire

## État d’implémentation

Implémenté.

## Limites connues

- le dépôt contient le module de notification, mais le volume réel des événements de notification et leur intégration de diffusion dans l’interface doivent être validés par test ou observation appliquée.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/notification/NotificationService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/notification/NotificationService.java)
- [frontend/src/pages/notifications/NotificationsPage.tsx](../../frontend/src/pages/notifications/NotificationsPage.tsx)
