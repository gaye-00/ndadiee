# Audit fonctionnel approfondi de Ndadiée

**Date :** 6 novembre 2026
**Périmètre :** code frontend et backend présent dans le dépôt. Aucun parcours n'a été exécuté dans cette phase et aucune donnée n'a été créée ou modifiée.

**Mise à jour déclarative :** le 11 novembre 2026, l’équipe a indiqué qu’Abdoulaye GAYE avait ajouté un parcours « mot de passe oublié » à la suite d’une suggestion d’Aliou DIOP. Une recherche dans le frontend et le backend présents dans la copie du dépôt examinée n’a retrouvé aucun écran, route, endpoint ou service correspondant. Le résultat de l’audit de code ci-dessous reste donc applicable à cette copie ; la fonctionnalité est déclarée par l’équipe mais non vérifiable tant que son code ou sa version déployée n’est pas localisé et testé.

L’équipe indique également que les deux membres ont testé les fonctionnalités et confirme le fonctionnement de la version en ligne, de l’API, de la base de données et des parcours principaux. Le lien de la vidéo de démonstration annoncée reste à fournir. Ces déclarations complètent le contexte de l’audit, mais ne changent pas le fait qu’aucun parcours de bout en bout n’a été exécuté par l’auditeur dans le cadre de cette revue.

## 1. Synthèse

Le dépôt contient une application fonctionnelle étendue : authentification par identifiants, profils de développeurs, projets et candidatures, communauté, hackathons, espace d'équipe, revues de code, messagerie, notifications, intégration GitHub et back-office. Les routes frontend et plusieurs appels REST sont reliés aux contrôleurs backend et aux services de domaine. Des tests unitaires ciblent plusieurs services.

Cette présence dans le code **ne valide pas le fonctionnement de bout en bout**. Aucun parcours décrit ci-dessous n'a été exécuté avec un navigateur, une API démarrée et des données synthétiques lors du présent audit. Il n'existe pas de suite frontend `*.test.*` / `*.spec.*` repérée dans `frontend/`. L'exécution de référence déjà consignée dans l'[audit opérationnel](./audit-operationnel.md) est une suite backend de **313 tests réussis** contre une base PostgreSQL temporaire, mais elle ne prouve pas les parcours utilisateur ni le fonctionnement d'intégrations externes.

Écarts fonctionnels particulièrement visibles dans le dépôt :

1. Aucun parcours ni endpoint de réinitialisation de mot de passe n'a été trouvé.
2. Les boutons GitHub, Google et GitLab du formulaire d'authentification signalent qu'ils ne sont pas disponibles ; aucun flux OAuth backend correspondant n'a été trouvé.
3. La déconnexion efface la session côté navigateur ; aucun endpoint backend de révocation/déconnexion n'a été trouvé.
4. Les endpoints backend de modification/suppression de projet existent, mais le service frontend n'est pas appelé pour ces opérations et aucune page d'édition de projet n'est définie dans le routeur.
5. La création, la modification et la suppression de hackathons existent côté backend pour la modération, sans appel frontend correspondant.
6. Des services/hooks d'articles existent mais aucun écran ou route dédiée aux articles n'a été identifié.
7. L'intégration GitHub lit et synchronise des données ; les commentaires et verdicts de revue sont gérés par Ndadiée, pas envoyés comme écritures à GitHub.
8. Les profils ont un niveau d'expérience, des compétences, des liens et des projets ; aucun historique structuré d'expériences professionnelles ni outil de portfolio distinct n'a été identifié.
9. Le back-office ne permet de modérer que les questions, réponses et projets ; articles, commentaires et contenus de revue ne figurent pas dans les types de contenu modérables.

## 2. Périmètre et méthode

### Inclus

- Pages, routes, composants, hooks, services HTTP et état de session du frontend.
- Contrôleurs REST/WebSocket, services métier, repositories, entités/relations, sécurité et tests backend.
- Correspondance des routes frontend avec les services et routes backend.
- Fonctionnalités absentes, non raccordées ou limitées à des données de démonstration.

### Méthode

1. Inventaire des pages et routes du routeur frontend.
2. Relevé des endpoints des contrôleurs et comparaison aux appels des services frontend.
3. Lecture des services métier, repositories et modèles du domaine.
4. Repérage des tests backend et absence/présence de tests frontend.
5. Qualification des constats par preuve dans le code. Une route ou un test unitaire est une preuve d'implémentation, pas une preuve d'exécution de parcours.

Les éléments présentés comme « présents » sont confirmés au niveau du code. Les parcours restent **non vérifiés en exécution**, sauf indication expresse. La liste des sources ci-dessous est représentative des points d'entrée et du domaine contrôlés ; les inventaires complets sont dans les répertoires liés.

## 3. Statuts et niveau de preuve

| Terme | Sens dans ce rapport |
|---|---|
| **Présent dans le code** | Route, composant ou logique métier repéré. N'implique pas que le parcours fonctionne en production. |
| **Partiel** | Un segment est codé, mais un écran, une écriture, une intégration ou une étape attendue manque. |
| **Non implémenté** | Aucun endpoint/parcours correspondant n'a été repéré dans le périmètre examiné. |
| **Non vérifiable** | Le code ne suffit pas à conclure au comportement réel ou l'exécution requise n'a pas eu lieu. |
| **Testé par test automatisé** | Il existe un test ciblé et l'exécution de référence décrite dans l'audit opérationnel l'incluait. Ce n'est pas un test end-to-end. |

## 4. Analyse détaillée par module

### 4.1 Authentification et compte

**Fonctions repérées**

- Inscription par formulaire et `POST /v1/auth/register`, puis ouverture de session avec les jetons retournés.
- Connexion par email ou nom d'utilisateur, renouvellement par refresh token et récupération du compte courant.
- Vérification de disponibilité du nom d'utilisateur pendant la saisie.
- Routes privées protégées dans le routeur React et contrôles d'authentification côté API.
- Le frontend stocke les jetons dans son stockage navigateur et renouvelle automatiquement l'access token après un `401` admissible. La connexion est stateless côté Spring.
- La commande de déconnexion efface le stockage local et le cache client ; aucun endpoint backend de révocation n'a été repéré.

**Manques et limites**

- Réinitialisation/oubli du mot de passe : aucun endpoint ni écran repéré.
- OAuth GitHub/Google/GitLab : boutons explicitement marqués « bientôt » et sans connexion backend.
- La déconnexion locale n'invalide pas un JWT déjà délivré côté serveur ; le comportement d'un jeton volé n'est pas évalué dans cet audit fonctionnel.
- Pas de parcours d'inscription, connexion, renouvellement et accès protégé exécuté dans cette phase.

**Surfaces et preuves**

- Frontend : [router/index.tsx](../../frontend/src/router/index.tsx), [ProtectedRoute.tsx](../../frontend/src/router/ProtectedRoute.tsx), [LoginPage.tsx](../../frontend/src/pages/auth/LoginPage.tsx), [RegisterPage.tsx](../../frontend/src/pages/auth/RegisterPage.tsx), [LoginForm.tsx](../../frontend/src/components/auth/LoginForm.tsx), [RegisterForm.tsx](../../frontend/src/components/auth/RegisterForm.tsx), [OAuthButtons.tsx](../../frontend/src/components/auth/OAuthButtons.tsx), [auth.service.ts](../../frontend/src/services/auth.service.ts), [api.ts](../../frontend/src/services/api.ts), [useAuthStore.ts](../../frontend/src/store/useAuthStore.ts).
- Backend : [AuthenticationController.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java), [AuthenticationService.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationService.java), [JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java), [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java), [UserRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/UserRepository.java), [RegisterRequest.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/RegisterRequest.java), [RefreshTokenRequest.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/RefreshTokenRequest.java).
- Données/tests : [User.java](../../backend/src/main/java/com/hautetech/ndadiee/model/user/User.java), [Developer.java](../../backend/src/main/java/com/hautetech/ndadiee/model/user/Developer.java), [AuthenticationServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/authentication/AuthenticationServiceTest.java), [JwtServiceConfigurationTest.java](../../backend/src/test/java/com/hautetech/ndadiee/security/JwtServiceConfigurationTest.java).

**État :** inscription, connexion et renouvellement présents dans le code ; déconnexion serveur, réinitialisation du mot de passe et OAuth non implémentés. Parcours réel non vérifié.

### 4.2 Profils et découverte des développeurs

**Fonctions repérées**

- Création initiale d'un compte développeur, puis modification du profil : nom, bio, pays/ville, langue, niveau, disponibilité, liens professionnels et jusqu'à 15 compétences.
- Téléversement/suppression d'avatar par endpoints dédiés.
- Profil public avec compétences, réputation, badges, abonnés/abonnements, projets, collaborateurs et activité.
- Recherche paginée de membres et suivi d'un développeur.
- Les compétences sont des associations vers `Tag`; les abonnements sont une relation développeur-développeur. Les projets sont indirectement exposés via les appartenances acceptées `ProjectMember`.

**Limites**

- Le champ d'expérience est un niveau (`ExperienceLevel`) et non un historique d'expériences professionnelles. Aucun modèle d'expérience/CV distinct n'a été identifié.
- Le portfolio est constitué de projets auxquels le membre participe et de liens externes ; aucun éditeur/objet portfolio indépendant n'a été identifié.
- La carte de contributions GitHub utilise un service tiers pour lire le calendrier public ; elle ne constitue pas une synchronisation générale du compte GitHub.
- Le fonctionnement d'édition, de téléversement et de recherche n'a pas été exécuté.

**Surfaces et preuves**

- Frontend : [ProfilePage.tsx](../../frontend/src/pages/profile/ProfilePage.tsx), [SettingsPage.tsx](../../frontend/src/pages/settings/SettingsPage.tsx), [ProfileHeader.tsx](../../frontend/src/components/profile/ProfileHeader.tsx), [AvatarEditorDialog.tsx](../../frontend/src/components/profile/AvatarEditorDialog.tsx), [user.service.ts](../../frontend/src/services/user.service.ts), [useUsers.ts](../../frontend/src/hooks/useUsers.ts), [useGithubContributions.ts](../../frontend/src/hooks/useGithubContributions.ts).
- Backend : [UserController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/UserController.java), [ProfileService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/user/ProfileService.java), [UserService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/user/UserService.java), [UpdateProfileRequest.java](../../backend/src/main/java/com/hautetech/ndadiee/dto/request/UpdateProfileRequest.java), [DeveloperRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/DeveloperRepository.java).
- Données/tests : [Developer.java](../../backend/src/main/java/com/hautetech/ndadiee/model/user/Developer.java), [Tag.java](../../backend/src/main/java/com/hautetech/ndadiee/model/content/Tag.java), [ProjectMember.java](../../backend/src/main/java/com/hautetech/ndadiee/model/project/ProjectMember.java), [ProfileServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/user/ProfileServiceTest.java).

**État :** profils, compétences, recherche et relations sociales présents dans le code ; expériences professionnelles structurées et portfolio dédié non implémentés. Parcours non vérifié.

### 4.3 Projets et collaborations

**Fonctions repérées**

- Vitrine paginée, recherche/filtrage et facettes ; page de détail par slug.
- Création de projet et gestion de rôles ouverts, images, dépôt, devlog et demandes de retours.
- Candidature à un projet avec état `PENDING`; acceptation/refus et retrait de membres par le porteur/gestionnaire. Les appartenances sont reliées à `Project` et `Developer` par `ProjectMember`, avec rôle, statut, spécialité et motivation.
- L'espace projet regroupe membres, tableau de tâches, sprints, discussion, événements et revues.

**Anomalie de raccordement**

- Le backend expose `PUT /v1/projects/{id}` et `DELETE /v1/projects/{id}` ; le frontend déclare des méthodes `update`/`delete` dans son service, mais aucune utilisation de ces méthodes ni page d'édition/suppression correspondante n'a été repérée. Les réglages du workspace (dépôt et recrutement) sont distincts et raccordés.
- L'appartenance/candidature et la gestion du tableau sont codées, mais aucun parcours de candidature avec deux comptes n'a été exécuté.

**Surfaces et preuves**

- Frontend : [ShowcasePage.tsx](../../frontend/src/pages/showcase/ShowcasePage.tsx), [ProjectPage.tsx](../../frontend/src/pages/projects/ProjectPage.tsx), [NewProjectPage.tsx](../../frontend/src/pages/projects/NewProjectPage.tsx), [MyProjectsPage.tsx](../../frontend/src/pages/projects/MyProjectsPage.tsx), [useProjects.ts](../../frontend/src/hooks/useProjects.ts), [project.service.ts](../../frontend/src/services/project.service.ts), [WorkspaceSettingsPage.tsx](../../frontend/src/pages/workspace/WorkspaceSettingsPage.tsx).
- Backend : [ProjectController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java), [ProjectOpeningController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ProjectOpeningController.java), [ProjectService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectService.java), [ProjectOpeningService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/project/ProjectOpeningService.java), [ProjectRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ProjectRepository.java), [ProjectMemberRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ProjectMemberRepository.java).
- Données/tests : [Project.java](../../backend/src/main/java/com/hautetech/ndadiee/model/project/Project.java), [ProjectMember.java](../../backend/src/main/java/com/hautetech/ndadiee/model/project/ProjectMember.java), [ProjectOpening.java](../../backend/src/main/java/com/hautetech/ndadiee/model/project/ProjectOpening.java), [ProjectServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/project/ProjectServiceTest.java), [ProjectPublishingServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/project/ProjectPublishingServiceTest.java), [ProjectOpeningServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/project/ProjectOpeningServiceTest.java).

**État :** création, lecture, recherche, candidature et gestion d'équipe présents dans le code ; édition/suppression de projet non raccordées à une interface trouvée. Parcours non vérifié.

### 4.4 Hackathons et événements

**Fonctions repérées**

- Liste et détail publics, recherche par statut/mot-clé/tag, affichage de jalons, prix, dates, équipes et palmarès.
- Un projet peut être inscrit par son porteur ou un mainteneur avant la clôture ; retrait avant le début.
- Le service backend réserve la création, la modification, la suppression et la publication des résultats à la modération.

**Anomalie de raccordement**

- La page et le formulaire d'inscription d'équipe sont raccordés, mais `hackathon.service.ts` ne propose que lecture, inscription/retrait d'équipe et liste des hackathons du membre. Aucun écran ou appel de modération CRUD n'a été repéré.
- Les données de démonstration ne sont pas une preuve d'événements réels ; les seeders de démo ont été désactivés par défaut lors du durcissement décrit dans les documents opérationnels.

**Surfaces et preuves**

- Frontend : [HackathonsPage.tsx](../../frontend/src/pages/hackathons/HackathonsPage.tsx), [HackathonPage.tsx](../../frontend/src/pages/hackathons/HackathonPage.tsx), [RegisterTeamDialog.tsx](../../frontend/src/components/hackathons/RegisterTeamDialog.tsx), [hackathon.service.ts](../../frontend/src/services/hackathon.service.ts), [useHackathons.ts](../../frontend/src/hooks/useHackathons.ts).
- Backend : [HackathonController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/HackathonController.java), [HackathonService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/hackathon/HackathonService.java), [HackathonRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/HackathonRepository.java), [HackathonTeamRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/HackathonTeamRepository.java).
- Données/tests : [Hackathon.java](../../backend/src/main/java/com/hautetech/ndadiee/model/hackathon/Hackathon.java), [HackathonTeam.java](../../backend/src/main/java/com/hautetech/ndadiee/model/hackathon/HackathonTeam.java), [HackathonServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/hackathon/HackathonServiceTest.java).

**État :** consultation, participation et règles métier présentes dans le code ; administration des événements non raccordée au frontend. Parcours non vérifié.

### 4.5 Forum et contenus communautaires

**Fonctions repérées**

- Sujets/questions, réponses, choix d'une réponse acceptée, statuts, tags, votes, favoris et commentaires.
- Filtrage/recherche des questions et recherche globale. Les commentaires sont une ressource liée à différents types de contenus.
- Articles : API backend de création, brouillon/publication, consultation et suppression ; service et hooks frontend présents.

**Manques et limites**

- Aucun chemin de page dédié aux articles n'est déclaré dans le routeur et aucun consommateur de `useArticles` hors de son fichier de définition n'a été identifié. Les appels API/hooks ne suffisent donc pas à établir un parcours utilisateur complet de lecture/édition d'article.
- La modération admin est limitée par `ModeratedContent` à `QUESTION`, `ANSWER`, `PROJECT` ; articles et commentaires ne sont pas modérables depuis cette interface selon le code examiné.
- Aucun test ciblé de `CommentService` ou test d'interface de forum n'a été repéré.

**Surfaces et preuves**

- Frontend : [ForumPage.tsx](../../frontend/src/pages/forum/ForumPage.tsx), [TopicPage.tsx](../../frontend/src/pages/forum/TopicPage.tsx), [NewTopicPage.tsx](../../frontend/src/pages/forum/NewTopicPage.tsx), [EditTopicPage.tsx](../../frontend/src/pages/forum/EditTopicPage.tsx), [ReplyForm.tsx](../../frontend/src/components/forum/ReplyForm.tsx), [ReplyComments.tsx](../../frontend/src/components/forum/ReplyComments.tsx), [question.service.ts](../../frontend/src/services/question.service.ts), [useQuestions.ts](../../frontend/src/hooks/useQuestions.ts), [article.service.ts](../../frontend/src/services/article.service.ts), [useArticles.ts](../../frontend/src/hooks/useArticles.ts).
- Backend : [QuestionController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/QuestionController.java), [AnswerController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/AnswerController.java), [CommentController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/CommentController.java), [VoteController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/VoteController.java), [ArticleController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ArticleController.java), [QuestionService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/content/QuestionService.java), repositories [QuestionRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/QuestionRepository.java), [AnswerRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/AnswerRepository.java), [CommentRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/CommentRepository.java), [VoteRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/VoteRepository.java), [BookmarkRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/BookmarkRepository.java), [ArticleRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ArticleRepository.java), [ModeratedContent.java](../../backend/src/main/java/com/hautetech/ndadiee/model/admin/ModeratedContent.java).
- Données/tests : [Question.java](../../backend/src/main/java/com/hautetech/ndadiee/model/content/Question.java), [Answer.java](../../backend/src/main/java/com/hautetech/ndadiee/model/content/Answer.java), [Article.java](../../backend/src/main/java/com/hautetech/ndadiee/model/content/Article.java), [Comment.java](../../backend/src/main/java/com/hautetech/ndadiee/model/interaction/Comment.java), [Vote.java](../../backend/src/main/java/com/hautetech/ndadiee/model/interaction/Vote.java), [QuestionServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/content/QuestionServiceTest.java), [AnswerServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/content/AnswerServiceTest.java), [VoteServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/interaction/VoteServiceTest.java), [BookmarkServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/interaction/BookmarkServiceTest.java).

**État :** questions/réponses/interactions présentes dans le code ; articles partiels côté interface et périmètre de modération incomplet. Parcours non vérifié.

### 4.6 Messagerie et notifications

**Messagerie**

- Conversations directes entre membres, envoi/édition/suppression de messages, pagination du fil, identifiant client anti-doublon et accusés de lecture.
- Les mutations sont enregistrées par REST. STOMP/WebSocket diffuse les événements et les signaux de frappe ; le JWT est passé au `CONNECT`, et les destinations sont filtrées.
- Le broker est en mémoire et prévu pour une seule instance selon `WebSocketConfig`; présence et événements temps réel n'ont pas été vérifiés avec deux navigateurs.

**Notifications**

- Notifications persistées, liste paginée, compteur non lu, marquage individuel ou global comme lu. Elles sont créées par des événements métier côté backend.
- Pas de test `NotificationService` ni test UI/API de notifications identifié dans l'inventaire des tests. Aucune action réelle n'a été exécutée pour vérifier la création, la livraison et la lecture.

**Surfaces et preuves**

- Frontend : [MessagesPage.tsx](../../frontend/src/pages/messages/MessagesPage.tsx), [useMessages.ts](../../frontend/src/hooks/useMessages.ts), [message.service.ts](../../frontend/src/services/message.service.ts), [chatSocket.ts](../../frontend/src/lib/chatSocket.ts), [NotificationsPage.tsx](../../frontend/src/pages/notifications/NotificationsPage.tsx), [useNotifications.ts](../../frontend/src/hooks/useNotifications.ts), [notification.service.ts](../../frontend/src/services/notification.service.ts).
- Backend : [ConversationController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ConversationController.java), [ChatSocketController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ChatSocketController.java), [WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java), [StompAuthenticationInterceptor.java](../../backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java), [MessageService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/message/MessageService.java), repositories [ConversationRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ConversationRepository.java), [ConversationParticipantRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ConversationParticipantRepository.java), [MessageRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/MessageRepository.java), [NotificationController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/NotificationController.java), [NotificationService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/notification/NotificationService.java), [NotificationListener.java](../../backend/src/main/java/com/hautetech/ndadiee/service/notification/NotificationListener.java), [NotificationRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/NotificationRepository.java).
- Données/tests : [Conversation.java](../../backend/src/main/java/com/hautetech/ndadiee/model/message/Conversation.java), [ConversationParticipant.java](../../backend/src/main/java/com/hautetech/ndadiee/model/message/ConversationParticipant.java), [Message.java](../../backend/src/main/java/com/hautetech/ndadiee/model/message/Message.java), [Notification.java](../../backend/src/main/java/com/hautetech/ndadiee/model/notification/Notification.java), [MessageServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/message/MessageServiceTest.java).

**État :** fonctionnalités présentes au niveau REST/WebSocket ; réception temps réel, erreurs réseau et notifications réellement déclenchées non vérifiées en parcours.

### 4.7 Workspace, tâches et événements d'équipe

- L'espace est réservé aux membres acceptés du projet ; porteur/mainteneurs gèrent sprints et actions de gestion.
- Tableau des tâches : création, édition, déplacement, suppression, affectation et lien éventuel à une PR ; sprint ouvert/clos.
- Discussion d'équipe et événements/rendez-vous avec participation. Les opérations du workspace passent par REST ; elles ne sont pas la messagerie privée STOMP.
- Tests de service existants pour accès workspace, tâches, sprints, discussion et liens PR.

**Surfaces et preuves**

- Frontend : [WorkspaceBoardPage.tsx](../../frontend/src/pages/workspace/WorkspaceBoardPage.tsx), [WorkspaceDevlogPage.tsx](../../frontend/src/pages/workspace/WorkspaceDevlogPage.tsx), [WorkspaceReviewsPage.tsx](../../frontend/src/pages/workspace/WorkspaceReviewsPage.tsx), [useWorkspace.ts](../../frontend/src/hooks/useWorkspace.ts), [workspace.service.ts](../../frontend/src/services/workspace.service.ts).
- Backend : [WorkspaceController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/WorkspaceController.java), [WorkspaceAccess.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/WorkspaceAccess.java), [TaskService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/TaskService.java), [SprintService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/SprintService.java), [TeamChatService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/workspace/TeamChatService.java), repositories [TaskRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/TaskRepository.java), [SprintRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/SprintRepository.java), [TeamMessageRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/TeamMessageRepository.java), [TeamEventAttendeeRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/TeamEventAttendeeRepository.java).
- Données/tests : [Task.java](../../backend/src/main/java/com/hautetech/ndadiee/model/workspace/Task.java), [Sprint.java](../../backend/src/main/java/com/hautetech/ndadiee/model/workspace/Sprint.java), [TeamMessage.java](../../backend/src/main/java/com/hautetech/ndadiee/model/workspace/TeamMessage.java), [WorkspaceAccessTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/workspace/WorkspaceAccessTest.java), [TaskServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/workspace/TaskServiceTest.java), [SprintServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/workspace/SprintServiceTest.java), [TeamChatServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/workspace/TeamChatServiceTest.java).

**État :** présent et testé au niveau de services unitaires ; parcours complet de collaboration non vérifié.

### 4.8 Revues de code et intégration GitHub

**Revues**

- Liste filtrée des PR, détails, fichiers/diffs, vérifications et issues ; prise/libération d'une revue, commentaires de ligne, verdict et retour d'utilité.
- Une synchronisation planifiée ou manuelle importe des PR du dépôt GitHub configuré.
- Les PR de démonstration ont un contenu local statique possible ; leur présence ne signifie pas qu'elles existent sur GitHub.
- Les commentaires et revues sont conservés par Ndadiée. La synchronisation déclarée lit GitHub ; les contrôleurs/services examinés n'implémentent pas de publication de commentaire, de verdict, de fusion ou de fermeture vers l'API GitHub.

**GitHub**

- Lecture d'un dépôt public pour préremplir un projet et liste de dépôts récents liés au profil.
- Synchronisation périodique des PR ; l'affichage du calendrier de contributions fait un appel navigateur séparé à un service tiers.
- Ce module n'est pas une authentification OAuth GitHub ni une intégration bidirectionnelle.

**Surfaces et preuves**

- Frontend : [ReviewsPage.tsx](../../frontend/src/pages/reviews/ReviewsPage.tsx), [ReviewPage.tsx](../../frontend/src/pages/reviews/ReviewPage.tsx), [WorkspaceReviewsPage.tsx](../../frontend/src/pages/workspace/WorkspaceReviewsPage.tsx), [review.service.ts](../../frontend/src/services/review.service.ts), [github.service.ts](../../frontend/src/services/github.service.ts), [useGithub.ts](../../frontend/src/hooks/useGithub.ts).
- Backend : [ReviewController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ReviewController.java), [PullRequestController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/PullRequestController.java), [RepositorySyncController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/RepositorySyncController.java), [GithubController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/GithubController.java), [ReviewService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/review/ReviewService.java), [PullRequestContentService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/review/PullRequestContentService.java), [PullRequestSyncService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/github/PullRequestSyncService.java), repositories [PullRequestRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/PullRequestRepository.java), [PullRequestReviewerRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/PullRequestReviewerRepository.java), [ReviewCommentRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ReviewCommentRepository.java), [RepositorySyncRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/RepositorySyncRepository.java), [GithubClient.java](../../backend/src/main/java/com/hautetech/ndadiee/github/GithubClient.java).
- Données/tests : [PullRequest.java](../../backend/src/main/java/com/hautetech/ndadiee/model/review/PullRequest.java), [PullRequestReviewer.java](../../backend/src/main/java/com/hautetech/ndadiee/model/review/PullRequestReviewer.java), [ReviewComment.java](../../backend/src/main/java/com/hautetech/ndadiee/model/review/ReviewComment.java), [PullRequestServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/review/PullRequestServiceTest.java), [PullRequestContentServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/review/PullRequestContentServiceTest.java), [PullRequestSyncServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/github/PullRequestSyncServiceTest.java), [GithubClientPullRequestsTest.java](../../backend/src/test/java/com/hautetech/ndadiee/github/GithubClientPullRequestsTest.java).

**État :** lecture/synchronisation GitHub et revue interne présentes ; échanges bidirectionnels de revues avec GitHub non implémentés. Connectivité/configuration réelle non vérifiée.

### 4.9 Administration et modération

- Pages de tableau de bord, comptes, contenus et journal ; backend permet recherche de comptes, suspension/réactivation, changement de rôle et journalisation d'actions.
- La sécurité backend vérifie permissions d'administration puis rôle ADMIN ; les services appliquent aussi des règles métier.
- Les types de contenu modérables sont exclusivement question, réponse et projet. La modération des articles, commentaires, hackathons et revues n'est pas fournie par le type backend examiné.
- Les opérations de compte ont des tests de service et un test de sécurité admin ; aucun scénario UI admin n'a été exécuté.

**Surfaces et preuves**

- Frontend : [AdminOverviewPage.tsx](../../frontend/src/pages/admin/AdminOverviewPage.tsx), [AdminUsersPage.tsx](../../frontend/src/pages/admin/AdminUsersPage.tsx), [AdminContentPage.tsx](../../frontend/src/pages/admin/AdminContentPage.tsx), [AdminJournalPage.tsx](../../frontend/src/pages/admin/AdminJournalPage.tsx), [AdminRoute.tsx](../../frontend/src/router/AdminRoute.tsx), [admin.service.ts](../../frontend/src/services/admin.service.ts).
- Backend : [AdminController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java), [AdminUserService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/admin/AdminUserService.java), [AdminContentService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/admin/AdminContentService.java), [AdminAuditService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/admin/AdminAuditService.java), repositories [AdminActionRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/AdminActionRepository.java), [UserRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/UserRepository.java), [ProjectRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/ProjectRepository.java), [QuestionRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/QuestionRepository.java), [AnswerRepository.java](../../backend/src/main/java/com/hautetech/ndadiee/repository/AnswerRepository.java), [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java), [ModeratedContent.java](../../backend/src/main/java/com/hautetech/ndadiee/model/admin/ModeratedContent.java).
- Données/tests : [Admin.java](../../backend/src/main/java/com/hautetech/ndadiee/model/user/Admin.java), [AdminAction.java](../../backend/src/main/java/com/hautetech/ndadiee/model/admin/AdminAction.java), [AdminSecurityTest.java](../../backend/src/test/java/com/hautetech/ndadiee/controller/AdminSecurityTest.java), [AdminUserServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/admin/AdminUserServiceTest.java), [AdminContentServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/admin/AdminContentServiceTest.java).

**État :** administration de comptes et modération de certains contenus présentes ; périmètre de modération incomplet et interface non testée.

## 5. Fonctionnalités confirmées, partielles et absentes

### Confirmées au niveau du code

- Inscription/connexion par identifiants et renouvellement JWT.
- Profil public/édition de profil, compétences, disponibilité, liens, avatar, projets et suivi.
- Création/consultation/recherche de projets et demandes d'adhésion.
- Forum de questions/réponses avec votes et favoris.
- Participation à un hackathon par projet.
- Workspace de projet, tâches, sprints, discussion et événements d'équipe.
- Revue interne de PR, commentaires, import/synchronisation GitHub en lecture.
- Conversations privées REST et événements STOMP.
- Notifications persistées, vues, compteurs et marquage comme lu.
- Gestion de comptes/admin et modération de questions/réponses/projets.

### Partielles

- Gestion de projet : la modification/suppression backend n'a pas de page ou d'appel frontend identifié.
- Profils : niveau et compétences disponibles, mais pas de CV/expériences structurées ni de portfolio autonome.
- Hackathons : inscription d'équipe présente ; publication et gestion sans interface frontend trouvée.
- Articles : services et endpoints présents, mais aucune route/écran dédié identifié.
- Revues GitHub : lecture et synchronisation seulement ; décisions/commentaires restent internes.
- Modération : trois familles de contenus seulement.
- Messagerie/notifications : code et tests unitaires partiels, sans parcours temps réel ni intégration end-to-end exécutés.

### Non implémentées dans le périmètre examiné

- Réinitialisation du mot de passe.
- Authentification OAuth GitHub, Google ou GitLab.
- Révocation serveur explicite des jetons via endpoint de déconnexion.
- Éditeur distinct d'expériences professionnelles et constructeur de portfolio.
- Publication de commentaire/verdict, fusion ou fermeture d'une PR depuis Ndadiée vers GitHub.

### Non vérifiables sans exécution ou environnement

- Réussite réelle de chaque parcours navigateur/API et cohérence des données affichées après mutation.
- Livraison WebSocket entre deux membres, reconnexion sur réseau instable et notifications créées par événements métier.
- Appels GitHub, SMTP, stockage externe, limites/quota, identifiants et disponibilité des intégrations.
- Comportement de l'application déployée et contenu effectif des données d'une instance.

## 6. Anomalies et recommandations priorisées

| Priorité | Constat | Risque/effet utilisateur | Recommandation |
|---|---|---|---|
| **Élevée** | Aucun parcours de récupération de mot de passe repéré. | Un membre qui perd son mot de passe n'a pas de procédure applicative de récupération. | Décider si cette fonction est requise pour la bêta ; sinon afficher explicitement une procédure de support avant ouverture publique. |
| **Élevée** | Aucun parcours fonctionnel n'a été exécuté lors de cet audit ; aucun test frontend automatisé repéré. | Les contrats peuvent être présents sans garantir la bonne intégration entre écrans, API et base. | Monter un staging isolé avec comptes synthétiques et dérouler les scénarios d'inscription, projet, candidature, forum, collaboration, revue, messages et administration. Ajouter des tests navigateur pour les parcours critiques. |
| **Élevée** | Les opérations d'édition/suppression de projet existent côté backend, sans usage frontend repéré. | Un porteur peut ne pas pouvoir corriger ou retirer son projet via l'interface. | Vérifier le besoin produit, puis raccorder explicitement les opérations ou documenter l'absence de gestion post-publication. |
| **Moyenne** | OAuth affiché mais indisponible. | L'affichage peut laisser croire qu'une connexion GitHub/Google/GitLab est disponible. | Conserver un état « bientôt » compréhensible ou retirer les commandes jusqu'au branchement réel. |
| **Moyenne** | CRUD des hackathons disponible seulement par backend/modération ; aucun écran frontend trouvé. | Les organisateurs/modérateurs ne peuvent pas gérer les événements par le produit. | Confirmer si la gestion est hors produit ; sinon prévoir une interface protégée et des tests de permissions. |
| **Moyenne** | API/hooks d'articles sans route/page dédiée repérée. | Création/lecture d'articles peut être inaccessible dans l'interface, sauf autre parcours non identifié. | Clarifier le périmètre de publication d'articles et vérifier le routage voulu avant de le présenter comme fonctionnalité utilisateur. |
| **Moyenne** | Les avis de revue sont internes et ne sont pas publiés sur GitHub. | Risque d'écart d'attente si « intégration GitHub » est comprise comme synchronisation bidirectionnelle. | Décrire la limite dans l'interface et la documentation ; ne pas promettre d'écriture sur GitHub. |
| **Moyenne** | La modération admin couvre questions, réponses et projets seulement. | Articles, commentaires et d'autres contenus ne disposent pas du même outil de modération. | Définir les contenus à modérer pour la bêta et compléter le périmètre ou signaler les limites de publication. |
| **Faible** | Le profil n'a ni chronologie d'expériences ni portfolio dédié. | Une partie de la présentation professionnelle attendue doit être représentée par le texte, les liens et les projets. | Présenter clairement ces limites et valider si elles conviennent au positionnement de la bêta. |
| **Faible** | La déconnexion est locale, sans révocation serveur explicite. | Un jeton déjà émis peut rester valable jusqu'à son expiration. | Confirmer la politique de session souhaitée et la documenter ; évaluer une révocation si le besoin produit l'exige. |

## 7. Suite recommandée

1. Prioriser la liste ci-dessus avec l'équipe produit ; ne pas traiter comme bug une limite produit qui serait volontaire.
2. Préparer un environnement de staging jetable avec deux comptes membres et un compte de modération synthétiques.
3. Documenter chaque essai avec version/commit, préconditions, actions, résultat observé et capture expurgée ; ne cocher « validé » qu'après exécution.
4. Tester en priorité l'inscription et la session, profil, projet/candidature avec deux comptes, sujet/réponse/commentaire, tâches et sprint, revue, messagerie/lecture, notifications et back-office.
5. Ajouter des tests UI/API ciblés pour les parcours de bêta et conserver l'exécution complète backend comme niveau unitaire/service, non comme preuve de parcours.

La [matrice fonctionnelle](./matrice-fonctionnelle.md) détaille les correspondances par capacité. Pour la disponibilité, les tests d'exploitation et l'état de déploiement, consulter l'[audit opérationnel](./audit-operationnel.md) et l'[état de préparation à la production](../07-deploiement/etat-preparation-production.md).
