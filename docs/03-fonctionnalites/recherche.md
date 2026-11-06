# Recherche et découverte

Statut : Implémenté.

## Présentation

La recherche globale récupère des résultats sur les questions, articles, projets et profils. L’objectif est de rendre la plateforme navigable et d’aider à la découverte de contenus et de profils utiles.

## Objectif

Offrir un moteur de recherche unifié sur les principaux éléments du réseau social de développeurs.

## Utilisateurs concernés

- visiteurs,
- développeurs connectés,
- équipe du produit.

## Fonctionnement

Le contrôleur [backend/src/main/java/com/hautetech/ndadiee/controller/SearchController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/SearchController.java) reçoit une requête `q` et un type de recherche (ALL, users, projects, etc.). Cet appel passe au service de recherche, qui agrège les résultats selon le type recherché.

## Parcours utilisateur

- le membre saisit un mot-clé dans la barre de recherche,
- le backend retourne les meilleures correspondances,
- le frontend présente les cartes et liens vers les contenus ou profils,
- l’utilisateur peut cliquer pour accéder à la page du projet, du profil ou de la question.

## Règles métier

- le type de recherche filtre la catégorie de résultats,
- la recherche est paginée pour gérer les résultats volumineux,
- les écrans publics utilisent `SearchPage` et la route dédiée.

## Permissions nécessaires

- public, avec lecture de résultats sans authentification.

## API associées

- `GET /v1/search`

## Composants frontend concernés

- [frontend/src/pages/search/SearchPage.tsx](../../frontend/src/pages/search/SearchPage.tsx)
- [frontend/src/hooks/useSearch.ts](../../frontend/src/hooks/useSearch.ts)
- [frontend/src/router/paths.ts](../../frontend/src/router/paths.ts)

## Entités et relations concernées

- `Question`, `Article`, `Project`, `Developer`, `Tag` selon le type de cible
- logique de recherche combinée et filtrage par catégorie

## État d’implémentation

Implémenté.

## Limites connues

- la recherche est globale et utilisable mais l’ampleur exacte des fonctions de recherche et les performances sur gros volume ne peuvent être confirmées sans benchmark réel.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/SearchController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/SearchController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/SearchService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/SearchService.java)
- [frontend/src/pages/search/SearchPage.tsx](../../frontend/src/pages/search/SearchPage.tsx)
