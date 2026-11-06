# Scénario de démonstration de Ndadiée

## Conditions préalables

Les parcours ci-dessous correspondent à des routes et composants présents dans le frontend. Ils ne prouvent pas qu’une instance publique est disponible. Ne les présenter en direct que si l’URL, les API, les données et les intégrations nécessaires ont été vérifiées juste avant la démonstration.

- Préparer une instance de démonstration distincte de toute donnée réelle.
- Préparer un utilisateur membre non administrateur et vérifier la création de compte.
- Préparer un projet d’exemple, un dépôt GitHub public avec une pull request accessible, et un second compte membre pour la collaboration.
- Confirmer que le WebSocket, les médias et les notifications fonctionnent sur l’instance.
- Si l’inscription ou un service externe échoue, expliquer la limite et passer à un compte de démonstration précréé ; ne pas prétendre avoir réussi le parcours.

Durée indicative : 8 à 10 minutes. Réduire le nombre d’étapes si la disponibilité ou le temps est limité.

## 1. Découvrir Ndadiée — 45 secondes

1. Ouvrir la page d’accueil `/`.
2. Présenter en quelques phrases la proposition de valeur, sans prétendre à une adoption ou un impact qui ne seraient pas mesurés.
3. Montrer la vitrine `/showcase` et l’accès à une fiche projet `/projects/{slug}`.
4. En option, montrer le motif visuel Kente ou les réglages de langue et d’économie de données dans `/settings`, uniquement s’ils sont accessibles et visibles sur l’instance.

Pages sources : [LandingPage.tsx](../frontend/src/pages/landing/LandingPage.tsx), [ShowcasePage.tsx](../frontend/src/pages/showcase/ShowcasePage.tsx), [SettingsPage.tsx](../frontend/src/pages/settings/SettingsPage.tsx), [router](../frontend/src/router/index.tsx).

## 2. Inscription et authentification — 60 secondes

1. Ouvrir `/register` et remplir le formulaire si l’environnement est configuré pour créer des comptes.
2. Afficher l’arrivée de la session connectée.
3. Si la création n’est pas souhaitable en direct, utiliser un compte de démonstration préalablement validé et montrer `/login`.
4. Expliquer brièvement les jetons d’accès/renouvellement au niveau produit, sans afficher de token ni de secret.

La connexion sociale ne doit pas être présentée comme disponible si le code l’annonce « bientôt ». Pages sources : [RegisterPage.tsx](../frontend/src/pages/auth/RegisterPage.tsx), [LoginPage.tsx](../frontend/src/pages/auth/LoginPage.tsx), [routes](../frontend/src/router/index.tsx).

## 3. Créer et découvrir des projets — 90 secondes

1. Ouvrir `/projects/new` en tant que membre connecté.
2. Créer un projet de démonstration, ou montrer un projet précréé si le temps est court.
3. Revenir à `/showcase`, découvrir le projet, puis l’ouvrir via `/projects/{slug}`.
4. Montrer les rôles recherchés et les informations du projet réellement présentes.
5. En option, créer/montrer une annonce depuis `/openings` si elle est préparée.

Ne pas prétendre que l’import GitHub ou l’upload R2 fonctionne sans avoir vérifié ces intégrations dans l’environnement. Pages sources : [NewProjectPage.tsx](../frontend/src/pages/projects/NewProjectPage.tsx), [ProjectPage.tsx](../frontend/src/pages/projects/ProjectPage.tsx), [paths.ts](../frontend/src/router/paths.ts).

## 4. Participation communautaire — 60 secondes

1. Ouvrir `/forum` et choisir un sujet existant.
2. Montrer le contenu, ses réponses et les interactions disponibles.
3. Si le compte et l’instance sont prêts, publier une réponse ou ouvrir `/forum/new` pour créer un sujet.

L’accès en écriture exige une session. Pages sources : [ForumPage.tsx](../frontend/src/pages/forum/ForumPage.tsx), [TopicPage.tsx](../frontend/src/pages/forum/TopicPage.tsx), [NewTopicPage.tsx](../frontend/src/pages/forum/NewTopicPage.tsx).

## 5. Collaborer entre développeurs — 90 secondes

1. Ouvrir `/projects/{slug}/workspace` pour un projet dont le compte de démonstration est membre.
2. Montrer le tableau et les fonctions d’équipe qui sont effectivement exposées à l’utilisateur.
3. Si ces onglets sont disponibles sur le projet préparé, présenter les rôles, le devlog ou les retours.
4. Pour une démonstration temps réel, utiliser un second compte préparé et confirmer la discussion d’équipe avant de l’annoncer.

Pages sources : [WorkspaceLayout.tsx](../frontend/src/components/layout/WorkspaceLayout.tsx), [pages workspace](../frontend/src/pages/workspace), [WorkspaceController.java](../backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java).

## 6. Revue de code — 60 secondes

1. Ouvrir `/reviews` ou une page préparée `/projects/{slug}/reviews/{number}`.
2. Montrer la pull request importée et les éléments de revue disponibles.
3. Ajouter un commentaire ou une évaluation uniquement si la permission du compte et la PR ont été testées.

Cette démonstration dépend de GitHub et de données préparées ; l’intégration ne doit pas être décrite comme CI/CD ou automatisation de merge. Pages sources : [ReviewsPage.tsx](../frontend/src/pages/reviews/ReviewsPage.tsx), [ReviewPage.tsx](../frontend/src/pages/reviews/ReviewPage.tsx), [GitHub feature](./03-fonctionnalites/github.md).

## 7. Messagerie — 60 secondes

1. Ouvrir `/messages`.
2. Choisir la conversation préexistante avec le second compte.
3. Envoyer un message de test et montrer la mise à jour en temps réel seulement si elle fonctionne à cet instant.

La messagerie dépend d’une session valide et du WebSocket STOMP ; prévoir un chemin de repli. Source : [MessagesPage.tsx](../frontend/src/pages/messages/MessagesPage.tsx), [architecture WebSocket](./02-architecture/architecture-websocket.md).

## 8. Fonctionnalité différenciante et conclusion — 45 secondes

Mettre en avant la combinaison de découverte de projets, d’échange communautaire, de collaboration d’équipe et de revue de code, ainsi que l’orientation visuelle Kente. Présenter ces choix comme des caractéristiques du produit, pas comme une preuve d’impact africain mesuré. Ne revendiquer les réglages de langue ou d’économie de données qu’après avoir vérifié leur présence et leur fonctionnement sur l’instance présentée.

Conclure par une limite connue et une prochaine étape fondée sur le backlog, puis indiquer où se trouve le dépôt. La disponibilité en production et l’hébergement Datacloud restent à prouver séparément.

## Vérification de répétition

| Parcours | Testé sur instance publique ? | Résultat/date | Repli |
|---|---|---|---|
| Découverte | À vérifier | À compléter | Capture/vidéo identifiée comme préenregistrée |
| Inscription/connexion | À vérifier | À compléter | Compte de démonstration validé |
| Projets | À vérifier | À compléter | Projet de démonstration préparé |
| Forum | À vérifier | À compléter | Sujet/réponse existants |
| Workspace | À vérifier | À compléter | Parcours à omettre si accès absent |
| Revue GitHub | À vérifier | À compléter | PR préparée ou étape omise |
| Messagerie temps réel | À vérifier | À compléter | Capture/vidéo ou étape omise |
