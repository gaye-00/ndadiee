# Matrice des fonctionnalités Ndadiée

| Domaine | Fonctionnalité | État réel | Vérification |
|---|---|---:|---|
| Authentification | Inscription, login, refresh token | Implémenté | Contrôleurs et services d’auth |
| Profils | Gestion du profil, avatar, réputation | Implémenté | `UserController`, `ProfileService` |
| Projets | Création, modification, membres, rôles | Implémenté | `ProjectController` |
| Candidatures | Recrutement et validation | Implémenté | `ProjectService` |
| Workspace | Tâches, sprints, échanges d’équipe | Implémenté | `WorkspaceController` |
| Forum | Questions, réponses, votes, tags | Implémenté | `QuestionController`, `AnswerController`, `VoteController` |
| Revues | PR, commentaires, verdicts | Implémenté | `ReviewController`, `PullRequestController` |
| GitHub | Import public, synchronisation des PR | Partiellement implémenté | `GithubController`, `RepositorySyncController`; aucune automatisation CI/CD ou preuve de production |
| Messages | Conversations, messages privés | Implémenté | `ConversationController` |
| Hackathons | Événement et équipes | Implémenté | `HackathonController` |
| Notifications | Événements de communauté | Implémenté | Services et flux de notifications |
| Administration | Modération, blocage, journal | Implémenté | `AdminController` |
| Datacloud | Déploiement réel | Non vérifié | Aucune preuve dans le dépôt |
| IA | Déclaration formelle de l’usage pendant le développement | Non vérifiable | Les informations de l’équipe ne sont pas disponibles dans le dépôt |
| Licences | Inventaire explicite | Non documenté | Nécessite audit dépendances |

## Conclusion
Le dépôt contient des implémentations sur les principaux domaines fonctionnels. Leur disponibilité en production, l’usage historique, la conformité des licences et la conformité au concours ne sont pas établis par la présence du code seule.
