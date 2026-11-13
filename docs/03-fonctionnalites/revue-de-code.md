# Revues de code

Statut : Implémenté.

## Présentation

Le module de revue de code permet de traiter les pull requests d’un projet, de s’en proposer comme relecteur, de commenter le diff, de rendre un verdict et de relier la revue à une tâche de projet.

## Objectif

Créer un espace de validation et de feedback sur le code dans le contexte d’un projet collaboratif, avec revue communautaire et contributions de réputation.

## Utilisateurs concernés

- porteur de projet,
- mainteneurs,
- contributeurs et relecteurs,
- membres du projet et communauté plus large.

## Fonctionnement

L’API expose :

- liste des PR selon un onglet (`TO_REVIEW`, `MY_TEAM`, etc.),
- vue d’ensemble des revues,
- prise en charge d’une revue,
- commentaires sur conversation ou lignes de diff,
- validation finale avec verdict et message.

Le contrôleur [backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java) précise les opérations faites sur une PR d’un projet donné.

## Parcours utilisateur

- l’équipe publie ou synchronise des pull requests depuis le dépôt GitHub,
- un membre se propose comme relecteur,
- il commente le diff ou la conversation,
- il soumet une revue valide avec approbation / changements demandés,
- un membre de l’équipe peut juger la revue utile et la réputation est ajustée.

## Règles métier

- les revues sont associées à un projet et à un numéro de pull request,
- le rôle de relecteur peut être pris puis libéré,
- les commentaires sont modifiés ou supprimés par leur auteur,
- les revues peuvent être jugées utiles par les membres de l’équipe.

## Permissions nécessaires

- authentifié pour consommer les revues, commenter et évaluer,
- droit métier selon le rôle sur le projet et sur la PR.

## API associées

- `GET /v1/reviews`
- `GET /v1/reviews/overview`
- `POST /v1/reviews/{id}/claim`
- `DELETE /v1/reviews/{id}/claim`
- `GET /v1/projects/{slug}/pull-requests/{number}`
- `GET /v1/projects/{slug}/pull-requests/{number}/files`
- `GET /v1/projects/{slug}/pull-requests/{number}/checks`
- `GET /v1/projects/{slug}/pull-requests/{number}/issues`
- `POST /v1/projects/{slug}/pull-requests/{number}/comments`
- `PATCH /v1/projects/{slug}/pull-requests/{number}/comments/{commentId}`
- `DELETE /v1/projects/{slug}/pull-requests/{number}/comments/{commentId}`
- `POST /v1/projects/{slug}/pull-requests/{number}/reviews`
- `PUT /v1/projects/{slug}/pull-requests/{number}/reviewers/{reviewerId}/helpful`

## Composants frontend concernés

- [frontend/src/pages/reviews/ReviewsPage.tsx](../../frontend/src/pages/reviews/ReviewsPage.tsx)
- [frontend/src/pages/reviews/ReviewPage.tsx](../../frontend/src/pages/reviews/ReviewPage.tsx)
- [frontend/src/hooks/useReviews.ts](../../frontend/src/hooks/useReviews.ts)
- [frontend/src/hooks/usePullRequest.ts](../../frontend/src/hooks/usePullRequest.ts)

## Entités et relations concernées

- `PullRequest`, `ReviewComment`, `PullRequestReviewer`, `RepositorySync` dans [backend/src/main/java/com/hautetech/ndadiee/model/review](../../backend/src/main/java/com/hautetech/ndadiee/model/review)
- `Project` comme conteneur du flux de revue
- `Developer` comme auteur de revue et contributeur

## État d’implémentation

Implémenté.

## Limites connues

- la revue est fonctionnelle au niveau de l’API et de l’UI, mais la couverture de test et la validation de scénarios de diff réel ne sont pas visibles dans le dépôt.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/ReviewController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ReviewController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/review/ReviewService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/review/ReviewService.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/review/PullRequestService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/review/PullRequestService.java)
