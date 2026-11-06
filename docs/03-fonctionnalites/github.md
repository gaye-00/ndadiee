# Intégration GitHub

Statut : Partiellement implémenté.

## Présentation

La plateforme lit des dépôts GitHub publics pour aider la création de projets et la synchronisation des pull requests. Elle est plus orientée vers l’import de métadonnées GitHub que vers une intégration profonde d’automatisation continue.

## Objectif

Faciliter le préremplissage de projet à partir d’un dépôt public et consolider la lecture de la vie d’un dépôt lié à un projet Ndadiée.

## Utilisateurs concernés

- membres connectés,
- porteurs de projet,
- équipes qui veulent importer une base de dépôt existante.

## Fonctionnement

Les endpoints GitHub permettent :

- importer un dépôt public à partir d’un `owner/name` ;
- récupérer les dépôts récents du profil GitHub du membre ;
- lier une pull request de dépôt au contexte de revue du projet ;
- synchroniser ensuite les PR visibles dans le service de revue.

## Parcours utilisateur

- le membre fournit un dépôt GitHub,
- la plateforme extrait sa description, les langages, le README, les tags et le site,
- l’utilisateur peut préremplir son projet,
- le système associe ensuite les pull requests au projet et aux revues de code.

## Règles métier

- seuls les dépôts publics sont lus,
- le dépôt est validé via une regex sur le format `owner/name`,
- les tags et langages sont raffinés depuis les métadonnées GitHub,
- le service applique un cache explicite pour limiter les appels répétés.

## Permissions nécessaires

- authentifié pour l’import et consultation de ses propres dépôts ;
- public n’est pas utilisé pour les imports de dépôt complet.

## API associées

- `GET /v1/github/repositories/{owner}/{name}`
- `GET /v1/github/me/repositories`
- `GET /v1/projects/{slug}/repository-sync`
- `POST /v1/projects/{slug}/repository-sync`

## Composants frontend concernés

- [frontend/src/hooks/useGithub.ts](../../frontend/src/hooks/useGithub.ts)
- [frontend/src/pages/projects/NewProjectPage.tsx](../../frontend/src/pages/projects/NewProjectPage.tsx)
- [frontend/src/pages/workspace/WorkspaceReviewsPage.tsx](../../frontend/src/pages/workspace/WorkspaceReviewsPage.tsx)

## Entités et relations concernées

- `RepositorySync`, `PullRequest` dans [backend/src/main/java/com/hautetech/ndadiee/model/review](../../backend/src/main/java/com/hautetech/ndadiee/model/review)
- `Project` comme support de projet GitHub lié

## État d’implémentation

Partiellement implémenté.

## Limites connues

- la lecture publique et la synchronisation de PR sont bien présentes, mais il n’y a pas de preuve dans le dépôt d’une intégration de CI/CD réelle, d’automatisation de merge, ni de déploiement Datacloud de cette couche.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/GithubController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/GithubController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/github/GithubRepositoryService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/github/GithubRepositoryService.java)
- [frontend/src/hooks/useGithub.ts](../../frontend/src/hooks/useGithub.ts)
