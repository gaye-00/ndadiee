# Communauté : forum, articles, tags, votes et commentaires

Statut : Implémenté.

## Présentation

La communauté Ndadiée associe forum de questions, publication d’articles, tags thématiques, commentaires et système de vote. L’objectif est de favoriser l’échange technique, l’enseignement et la découverte de contenus utiles.

## Objectif

Créer un espace de connaissance partagé où les membres peuvent poser des questions, écrire des articles, noter des contenus, suivre des tags et interagir autour d’objets de contenu.

## Utilisateurs concernés

- membres connectés,
- visiteurs en lecture publique,
- modérateurs et administrateurs.

## Fonctionnement

Le projet expose des contrôleurs spécialisés pour les questions, les articles, les commentaires, les votes, les tags et le fil personnalisé.

Le forum prend en charge :

- recherche de sujets,
- filtres par tags, statut, auteur et périodicité,
- sauvegarde de sujets,
- modération du statut de la question,
- réponses acceptées.

Les articles permettent :

- création en brouillon puis publication,
- navigation publique par tag, langue ou auteur,
- gestion de visibilité.

Les commentaires et votes sont liés à des cibles de contenu (`ContentType`).

## Parcours utilisateur

- un membre publie une question ou un article ;
- il suit des tags ou enregistre des contenus ;
- d’autres membres votent, commentent, répondent ;
- les plus utiles sont mis en évidence par la logique métier ;
- le modérateur ou l’auteur peut masquer, modifier ou supprimer le contenu selon les règles.

## Règles métier

- le statut d’une question peut être modifié par l’auteur ou un modérateur ;
- la suppression d’un sujet dépend du contexte (auteur si aucune réponse, ou modérateur) ;
- les contenus masqués ne sont plus visibles dans la vue publique ;
- le `FeedService` donne un fil personnalisé basé sur les tags et auteurs suivis.

## Permissions nécessaires

- lecture publique pour questions, articles, tags, commentaires et votes visibles ;
- authentifié pour créer, modifier, voter, sauvegarder, commenter et suivre des tags.

## API associées

- `GET /v1/questions`
- `GET /v1/questions/overview`
- `GET /v1/questions/{slug}`
- `GET /v1/questions/{id}/answers`
- `POST /v1/questions`
- `PUT /v1/questions/{id}`
- `PATCH /v1/questions/{id}/status`
- `DELETE /v1/questions/{id}`
- `GET /v1/articles`
- `GET /v1/articles/{slug}`
- `POST /v1/articles`
- `PUT /v1/articles/{id}`
- `POST /v1/articles/{id}/publish`
- `DELETE /v1/articles/{id}`
- `GET /v1/comments`
- `POST /v1/comments`
- `PUT /v1/comments/{id}`
- `DELETE /v1/comments/{id}`
- `POST /v1/votes`
- `DELETE /v1/votes`
- `GET /v1/tags`
- `POST /v1/tags/{slug}/follow`
- `GET /v1/feed`

## Composants frontend concernés

- [frontend/src/pages/forum/ForumPage.tsx](../../frontend/src/pages/forum/ForumPage.tsx)
- [frontend/src/pages/forum/TopicPage.tsx](../../frontend/src/pages/forum/TopicPage.tsx)
- [frontend/src/hooks/useQuestions.ts](../../frontend/src/hooks/useQuestions.ts)
- [frontend/src/hooks/useFeed.ts](../../frontend/src/hooks/useFeed.ts)
- [frontend/src/hooks/useComments.ts](../../frontend/src/hooks/useComments.ts)
- [frontend/src/hooks/useVotes.ts](../../frontend/src/hooks/useVotes.ts)

## Entités et relations concernées

- `Question`, `Answer`, `Article`, `Tag`, `Comment`, `Vote`, `Bookmark` dans [backend/src/main/java/com/hautetech/ndadiee/model](../../backend/src/main/java/com/hautetech/ndadiee/model)
- relations avec `Developer` comme auteur et `ContentType` pour commentaires/votes

## État d’implémentation

Implémenté.

## Limites connues

- le dépôt confirme la présence de nombreux mécanismes communautaires, mais les règles de modération ou l’usage réel du feed personnalisé restent à valider par une utilisation concrète et par tests d’intégration.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/QuestionController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/QuestionController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/ArticleController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ArticleController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/CommentController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/CommentController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/VoteController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/VoteController.java)
- [backend/src/main/java/com/hautetech/ndadiee/controller/TagController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/TagController.java)
