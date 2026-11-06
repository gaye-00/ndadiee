# Administration et modération

Statut : Implémenté.

## Présentation

Le back-office de Ndadiée est réservé aux comptes d’administration. Il permet de surveiller les utilisateurs, modérer les contenus, suivre les journaux d’action et gérer les comptes suspendus.

## Objectif

Garantir une surveillance de la plateforme, la capacité de bloquer des comptes, masquer ou supprimer des contenus et tracer les décisions de modération.

## Utilisateurs concernés

- administrateurs,
- modérateurs (selon rôle `MODERATOR` et permissions associées),
- membres concernés par les actions de modération.

## Fonctionnement

L’API admin expose :

- vue d’ensemble de la plateforme,
- liste des comptes avec filtre par rôle / statut,
- blocage et déblocage d’un compte,
- changement de rôle,
- liste des contenus masqués ou visibles,
- masquage / rétablissement / suppression de contenu,
- journal d’activité admin.

## Parcours utilisateur

- un admin consulte l’overview de la plateforme,
- il cherche un compte ou un contenu à modérer,
- il applique un blocage, un masquage ou une suppression,
- le journal garde trace de la décision.

## Règles métier

- la route est doublée par `@PreAuthorize("hasRole('ADMIN')")` et par les règles URL de `SecurityConfiguration`,
- l’admin ne peut pas bloquer un compte administrateur sans logique spécifique plus poussée dans le service,
- les contenus cachés restent visibles au propriétaire selon la logique d’exposition.

## Permissions nécessaires

- `ADMIN_READ`, `ADMIN_UPDATE`, `ADMIN_DELETE` selon la méthode HTTP et la route, via `SecurityConfiguration` ;
- `@PreAuthorize` sur le contrôleur.

## API associées

- `GET /v1/admin/overview`
- `GET /v1/admin/users`
- `POST /v1/admin/users/{id}/block`
- `POST /v1/admin/users/{id}/unblock`
- `PATCH /v1/admin/users/{id}/role`
- `GET /v1/admin/content`
- `POST /v1/admin/content/{type}/{id}/hide`
- `POST /v1/admin/content/{type}/{id}/unhide`
- `DELETE /v1/admin/content/{type}/{id}`
- `GET /v1/admin/actions`

## Composants frontend concernés

- [frontend/src/pages/admin/AdminOverviewPage.tsx](../../frontend/src/pages/admin/AdminOverviewPage.tsx)
- [frontend/src/pages/admin/AdminUsersPage.tsx](../../frontend/src/pages/admin/AdminUsersPage.tsx)
- [frontend/src/pages/admin/AdminContentPage.tsx](../../frontend/src/pages/admin/AdminContentPage.tsx)
- [frontend/src/pages/admin/AdminJournalPage.tsx](../../frontend/src/pages/admin/AdminJournalPage.tsx)
- [frontend/src/hooks/useAdmin.ts](../../frontend/src/hooks/useAdmin.ts)

## Entités et relations concernées

- `AdminAction`, `ModeratedContent`, `AdminTargetType` dans [backend/src/main/java/com/hautetech/ndadiee/model/admin](../../backend/src/main/java/com/hautetech/ndadiee/model/admin)
- `User`, `Role`, `Developer` pour les comptes et leurs autorisations

## État d’implémentation

Implémenté.

## Limites connues

- le back-office est bien là, mais le niveau réel de vérification de la modération des différents types de contenus dépend des cas d’usage réels et des procédures organisationnelles non visibles dans le dépôt.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
- [frontend/src/pages/admin](../../frontend/src/pages/admin)
