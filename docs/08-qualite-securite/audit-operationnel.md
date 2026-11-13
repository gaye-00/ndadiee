# Audit opérationnel de Ndadiée

**Date :** 6 novembre 2026
**Périmètre :** dépôt local, démarrage du frontend, commandes de qualité et suite de tests backend. Aucun environnement public n’a été sollicité.

## 1. Conclusion

**Mise à jour après durcissement, 6 novembre 2026 :** les risques de configuration initiaux ont été corrigés dans le dépôt. La clé JWT est obligatoire et validée au démarrage, les seeders sont désactivés par défaut et Flyway applique une migration initiale V1 ; Hibernate utilise `validate` dans tous les profils.

La migration a été appliquée sur une base PostgreSQL 17 neuve, puis validée par le test de contexte Spring. Une base historique jetable a également été explicitement baselinée en version 1 ; le contexte Spring l'a validée sans modification du nombre d'utilisateurs (0) ni des badges (7). La suite backend a ensuite réussi sur la base migrée : **313 tests, 0 échec, 0 erreur, 0 ignoré**, y compris le test de sécurité des comptes de démonstration sous le profil `prod`. Les commandes frontend `npm run build`, `npm run lint` et `npm run i18n:check` ont toutes réussi. Le conteneur temporaire sera arrêté après la mise à jour documentaire ; le volume PostgreSQL du projet n’a pas été touché.

**La production n’est toujours pas prête à être déclarée ni démontrée en ligne.** La migration initiale est en place, mais la compatibilité avec la base réelle de production et sa baseline restent à vérifier à partir d'une sauvegarde contrôlée. Les secrets et profils d’une infrastructure distante restent non vérifiables, aucun parcours métier end-to-end n’a été exécuté et aucun déploiement public n’a été testé. Une tentative initiale sans PostgreSQL accessible avait échoué ; le résultat corrigé et final est celui indiqué ci-dessous.

## 2. Statuts utilisés

- **Vérifié** : fait directement observé dans le dépôt ou pendant une exécution, qu’il s’agisse d’une présence ou d’une absence.
- **Échoué** : exécution tentée qui n’a pas satisfait son objectif.
- **Non vérifiable** : preuve ou accès manquant ; aucune conclusion positive n’est tirée.
- **Non applicable** : contrôle sans objet pour le périmètre concerné.

Les priorités **Critique / Élevée / Moyenne / Faible** indiquent l’urgence de traiter un risque, et non la preuve qu’un déploiement vulnérable existe.

## 3. Démarrage et validation locale après durcissement

| Contrôle | Résultat observé | Statut |
|---|---|---|
| Runtimes | Java 21, Node.js 24, npm 11, Docker et Docker Compose disponibles localement | Vérifié |
| Build frontend `npm run build` | TypeScript et build Vite terminés avec succès | Vérifié |
| Lint frontend `npm run lint` | Succès | Vérifié |
| Cohérence i18n `npm run i18n:check` | Succès : 10 langues et 12 espaces de noms | Vérifié |
| Démarrage Vite | La page `/` a répondu en HTTP 200 ; le navigateur intégré a rendu l’interface d’accueil. Le serveur local a ensuite été arrêté. | Vérifié |
| Tests frontend de parcours | Aucun script de test frontend déclaré ; aucun scénario métier exécuté | Non vérifiable |
| Profil Spring | La suite de contexte a utilisé `test`; profils locaux et de production vérifiés dans les fichiers de configuration. Le profil d’un déploiement distant reste inconnu. | Vérifié dans le test / Non vérifiable en production |
| Configuration JWT | Clé obligatoire, validation Base64 et minimum de 256 bits ; test ciblé : 4 tests, 0 échec. Aucun secret réel n’a été affiché. | Vérifié |
| Seeders | Désactivés par défaut ; activation requiert les trois mots de passe configurés. Le test de contexte confirme l’absence des trois comptes de démo connus dans la base de test. | Vérifié en code et en test |
| Schéma JPA/Flyway | Une migration V1 versionnée s'applique à une base neuve ; `ddl-auto=validate` dans tous les profils. Migration et validation testées sur PostgreSQL 17 jetable. | Vérifié |
| Suite backend `./mvnw test` | 313 tests exécutés : 313 réussis, 0 échec, 0 erreur, 0 ignoré, avec PostgreSQL temporaire | Vérifié |
| PostgreSQL temporaire | PostgreSQL 17 conteneurisé, isolé et sans volume ; disponibilité vérifiée, base utilisée par la suite de tests puis conteneur supprimé | Vérifié |
| PostgreSQL local Compose et volume existant | Non démarré, modifié ni supprimé pendant les tests | Vérifié |
| API backend persistante | Le contexte Spring s’est chargé durant le test ; aucun serveur API durable ni endpoint métier live n’a été exposé ou testé. | Non applicable au test / parcours non vérifiés |

La suite vérifie les tests automatisés backend, pas l’ensemble des parcours utilisateur ni le fonctionnement des intégrations externes en environnement réel.

## 4. Parcours fonctionnels

Les composants et routes présents dans le dépôt ne sont pas assimilés à des parcours validés. La page d’accueil frontend est le seul parcours d’interface ayant fait l’objet d’un smoke test local ; aucun compte ni jeu de données réel n’a été utilisé.

| Parcours | Préconditions | Étapes et résultat attendu | Observation réelle | Statut |
|---|---|---|---|---|
| Inscription et connexion | Backend, PostgreSQL, configuration de session et application disponibles | Créer un compte, ouvrir une session, puis accéder à une route protégée | Non exécuté ; API indisponible | Non vérifiable |
| Consulter/modifier un profil | Session membre et API disponibles | Ouvrir un profil, modifier les champs permis, retrouver les changements | Non exécuté | Non vérifiable |
| Créer/consulter un projet | Session membre, API et base disponibles | Créer un projet puis le retrouver dans la vitrine et sa page | Non exécuté | Non vérifiable |
| Candidater à un projet | Projet ouvert aux candidatures et session membre | Déposer une candidature puis vérifier son état côté équipe | Non exécuté | Non vérifiable |
| Créer/participer à une discussion | API et compte membre | Publier un sujet/réponse puis vérifier la lecture et les interactions | Non exécuté | Non vérifiable |
| Workspace et tâches | Projet accessible au membre et API disponible | Ouvrir l’espace d’équipe, créer/modifier une tâche, contrôler son état | Non exécuté | Non vérifiable |
| Revue de code | Projet lié à un dépôt et PR accessible | Charger une PR, publier une revue autorisée et vérifier son affichage | Non exécuté ; GitHub non interrogé | Non vérifiable |
| Messagerie | Deux comptes de test, backend et WebSocket opérationnels | Ouvrir une conversation, envoyer puis recevoir un message | Non exécuté ; WebSocket non testé | Non vérifiable |
| Notifications | Session, événements métier et API disponibles | Déclencher puis consulter/mettre à jour une notification | Non exécuté | Non vérifiable |
| Intégration GitHub | Accès réseau autorisé, configuration et quota disponibles | Lire un dépôt public et synchroniser ses PR | Aucun appel externe effectué | Non vérifiable |
| Administration | Compte admin isolé et backend disponible | Accéder au back-office et vérifier une action d’administration autorisée | Aucun parcours UI/API exécuté ; les tests automatisés backend liés à la sécurité sont inclus dans les tests qui ont réussi | Non vérifiable |
| Découverte de l’accueil | Frontend local disponible | Ouvrir `/` et afficher l’interface | Réponse HTTP 200 et rendu observés ; ne valide ni le backend ni la vitrine dynamique | Vérifié |

Les essais de démonstration doivent employer une base jetable et des comptes synthétiques, sans données personnelles ou réelles.

## 5. Constatations de sécurité opérationnelle

Les entrées SEC-OP-01 à SEC-OP-04 du relevé initial ont été corrigées dans le dépôt. Cette correction ne prouve pas que la configuration distante a été mise à jour.

| ID | Priorité | Constat et preuve | Risque | Action requise avant production | Statut |
|---|---|---|---|---|---|
| SEC-OP-01 | **Corrigé localement — Critique initiale** | [application.yaml](../../backend/src/main/resources/application.yaml) ne fournit aucun fallback JWT ; [JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java) rejette une clé absente, invalide ou trop courte. | Mauvaise injection de secret empêche le démarrage ; état distant inconnu. | Injecter un secret sûr hors dépôt et vérifier le démarrage du déploiement cible. | Correction vérifiée ; infrastructure distante non vérifiable |
| SEC-OP-02 | **Corrigé localement — Critique initiale** | Les seeders sont off par défaut ; mots de passe sans fallback et validation avant initialisation dans [InitializerNdadiee.java](../../backend/src/main/java/com/hautetech/ndadiee/initializer/InitializerNdadiee.java). Le test vérifie l’absence des comptes de démo dans la base jetable. | Les comptes de production réels n’ont pas été inspectés. | Garder les seeders désactivés et contrôler la base cible avant ouverture. | Correction et test vérifiés ; comptes distants non vérifiables |
| SEC-OP-03 | **Corrigé localement — Critique initiale** | Flyway applique V1 et Hibernate valide le schéma dans tous les profils. V1 a été appliquée sur une base vide ; une baseline version 1 et validation Hibernate ont été testées sur une base existante jetable. | L'état du schéma de production réel et sa compatibilité à V1 ne sont pas vérifiés. | Comparer une sauvegarde de la base cible à V1, puis effectuer une baseline contrôlée avant démarrage. | Migration vérifiée en test ; production non vérifiable |
| SEC-OP-04 | **Réduit — Élevée initiale** | Le profil production désactive les seeders et fixe `validate`; les secrets doivent venir de l’environnement. | Présence et valeurs des variables sur l’infrastructure non vérifiables. | Vérifier le profil et l’injection des paramètres dans l’environnement cible. | Fichiers vérifiés ; runtime distant non vérifiable |
| SEC-OP-05 | **Moyenne** | [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java) autorise l’origine frontend configurée et `http://localhost:*`, avec méthodes/en-têtes génériques et credentials ; Swagger et OpenAPI sont accessibles sans authentification. | Surface de configuration plus large que nécessaire en production ; exposition de la documentation technique. Ce n’est pas à lui seul une vulnérabilité confirmée. | Restreindre les origines au domaine attendu, retirer les origines de développement en production et décider si Swagger doit être protégé ou désactivé publiquement. | Vérifié dans le code ; comportement distant non vérifiable |
| SEC-OP-06 | **Moyenne** | Les jetons frontend sont conservés dans le stockage navigateur selon le code de session existant. | Une injection de script réussie pourrait exposer les jetons ; aucune exploitation n’a été tentée. | Réexaminer ce choix avec le modèle de menace de production et renforcer prévention XSS, CSP et dépendances. | Vérifié dans le code ; test dynamique non effectué |

Les règles d’administration et le filtre JWT sont présents dans le code. L’exécution de la suite backend inclut des tests qui passent, notamment les tests de sécurité d’administration ; aucun accès distant n’a été testé et aucun environnement public n’a été sondé.

## 6. Services externes et erreurs

| Service / contrôle | Éléments disponibles | Résultat opérationnel |
|---|---|---|
| PostgreSQL | Service Compose local `postgres`, image PostgreSQL 17, healthcheck `pg_isready`, volume nommé | Deux bases temporaires sans volume ont permis de tester l'application de V1 sur une base neuve et la baseline d'un schéma existant, puis les tests backend. Les conteneurs ont été supprimés. Le volume du projet n’a pas été touché. Sauvegardes et restauration de production non validées. |
| GitHub | Client et synchronisation présents ; token optionnel selon la configuration | Aucun appel au service externe ; token, quota et accès non vérifiés. |
| SMTP | Profil `prod` configurant un serveur SMTP externe ; identifiants attendus via environnement | Aucun secret affiché, aucune connexion SMTP tentée ; disponibilité non vérifiable. |
| Cloudflare R2 / S3 | Configuration prévue ; le mode `auto` peut retomber sur le disque local si les paramètres R2 ne sont pas complets | Aucun bucket ni accès réel vérifié ; stockage en production non vérifiable. |
| Gestion d’erreurs | Gestionnaires d’authentification, d’accès interdit et d’exceptions présents dans les sources | Aucun contrat de réponse n’a été vérifié par requête HTTP live, le backend ne démarrant pas. |

Le rapport n’a affiché aucune valeur de `.env` ou de secret et n’a utilisé aucune donnée réelle. Les fichiers d’environnement réels n’ont pas été lus.

## 7. Actions prioritaires

1. Bloquer toute mise en ligne jusqu'à comparaison de V1 avec une sauvegarde contrôlée de la base cible, baseline explicite si compatible, puis démarrage `validate` réussi.
2. Vérifier les secrets, le profil Spring et l’absence de comptes de démonstration sur l’infrastructure cible.
3. Démarrer le backend dans un staging avec une configuration contrôlée ; vérifier la santé, les réponses d’erreur et les règles d’accès.
4. Répéter tous les parcours du tableau dans un staging avec comptes et données synthétiques, y compris STOMP, uploads et GitHub si ces fonctions sont incluses.
5. Définir le stockage persistant, les sauvegardes/restaurations, la supervision, le domaine HTTPS et les preuves Datacloud/publication.
6. Collecter les preuves datées d’une URL publique et de son accessibilité externe avant d’annoncer une démonstration en ligne.

Voir aussi l’[état de préparation à la production](../07-deploiement/etat-preparation-production.md), le [plan des actions restantes](../plan-actions-restantes.md) et la [stratégie de tests](./strategie-de-tests.md).

## Sources principales

- [application.yaml](../../backend/src/main/resources/application.yaml)
- [application-prod.yaml](../../backend/src/main/resources/application-prod.yaml)
- [docker-compose.yml](../../docker-compose.yml)
- [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
- [InitializerNdadiee.java](../../backend/src/main/java/com/hautetech/ndadiee/initializer/InitializerNdadiee.java)
- [NdadieeApplicationTests.java](../../backend/src/test/java/com/hautetech/ndadiee/NdadieeApplicationTests.java)
- [frontend/package.json](../../frontend/package.json)
