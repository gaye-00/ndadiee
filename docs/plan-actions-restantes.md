# Plan des actions restantes

Échéance de référence : **15 novembre 2026**, selon le calendrier transmis par l’équipe. Le règlement et toute prolongation doivent être confirmés auprès de l’organisateur. Le plan ci-dessous n’affirme pas que les actions sont réalisées.

## Informations confirmées et preuves ajoutées au 13 novembre 2026

- L’équipe confirme que [https://ndadiee.com/](https://ndadiee.com/) est accessible depuis l’extérieur avec HTTPS, et que la version en ligne, l’API, la base et les principaux parcours fonctionnent. Le 13 novembre, une requête externe a reçu HTTP 200 avec TLS validé ; le détail et les limites sont consignés dans l’[état de préparation production](07-deploiement/etat-preparation-production.md).
- Vidéo transmise : [Ndadiée : la plateforme de collaboration des développeurs africains](https://youtu.be/Xv030XysB88). YouTube fournit ses métadonnées et son titre ; le navigateur d’audit n’a pas décodé la lecture, donc son contenu reste à examiner par l’équipe. Le dépôt contient aussi une copie locale de 181 499 229 octets, non poussée car supérieure à la limite ordinaire de 100 MiB par fichier GitHub.
- L’équipe confirme son inscription à deux membres : **Abdoulaye GAYE et Aliou DIOP**. Elle indique que les deux ont participé aux tests, qu’Aliou a contribué à l’audit fonctionnel et suggéré le parcours mot de passe oublié, puis qu’Abdoulaye l’a ajouté. Cette fonctionnalité n’a pas été retrouvée dans le code examiné et doit être localisée/validée avant d’être présentée comme disponible.
- ChatGPT et GitHub Copilot ont été utilisés pendant la recherche et le développement pour améliorer la documentation. Claude a aidé Abdoulaye pour des éléments backend ; les deux membres ont relu les résultats et Aliou a effectué une vérification supplémentaire, selon leur confirmation.
- Aliou DIOP indique un accord envisagé de partage du prix à parts égales en cas de victoire ; les deux membres doivent le confirmer et vérifier les règles applicables.
- L’équipe confirme que le cadre de concours résumé dans le dossier correspond aux conditions reçues.

## Réalisé le 6 novembre 2026

| Action | Résultat vérifié | Limite restante |
|---|---|---|
| Supprimer le fallback JWT et valider la clé au démarrage | Clé obligatoire, validation Base64 et minimum 256 bits ; 4 tests ciblés réussis | L’injection réelle du secret sur une infrastructure reste à prouver |
| Désactiver les seeders et retirer leurs mots de passe par défaut | Seeders off par défaut ; activation exige les trois variables ; comptes démo absents de la base de test | La base distante n’a pas été inspectée |
| Ajouter une migration initiale non destructive | Flyway V1 appliquée sur base neuve ; baseline version 1 testée sur schéma historique jetable, avec Hibernate `validate` | Comparer une sauvegarde de la base réelle à V1 avant toute baseline de production |
| Exécuter la suite backend contre une base isolée | PostgreSQL 17 temporaire sans volume ; 313 tests, 0 échec, 0 erreur, 0 ignoré, dont le contrôle du profil `prod` | Pas de parcours end-to-end ni d’intégration externe réelle |
| Vérifier le frontend | `npm run build`, `npm run lint`, `npm run i18n:check` réussis | Parcours UI/API en staging non testés |

Le conteneur PostgreSQL temporaire a été supprimé après la suite. Le volume PostgreSQL du projet n’a pas été démarré, modifié ou supprimé.

## Priorité immédiate — preuve et sécurité de production

| Action | Résultat attendu | Preuve à conserver | Responsable |
|---|---|---|---|
| Vérifier le schéma historique et baseliner la base cible si compatible | Sauvegarde vérifiée, comparaison au schéma V1 réussie, baseline `1` explicite puis démarrage Hibernate `validate` réussi | Rapport de diff schéma expurgé, sauvegarde vérifiée, sortie de baseline/démarrage | Équipe technique |
| Vérifier les profils/secrets et les données de démonstration sur l’infrastructure cible | Profil attendu, JWT sûr, seeders désactivés et aucun compte démo en base | Configuration expurgée, démarrage et contrôle de base | Équipe technique |
| Exécuter les parcours métier en staging avec données synthétiques | Authentification, profils, projets, forum, collaboration, revue, messages, notifications et administration vérifiés selon le périmètre de démo | Résultats par parcours, date, commit et environnement | Équipe |
| Confirmer la persistance des données et des médias | Sauvegarde puis restauration effectivement réussies | Procès-verbal de reprise, sans données sensibles | Opérateur à désigner |
| Archiver le document officiel des conditions CADEV reçu par l’équipe | Copie datée des conditions consultable pour référence du jury | Règlement/communication officielle | Équipe |
| Confirmer que la vidéo montre les parcours prévus et identifier la version présentée | Revue humaine de la vidéo effectuée ; commit de remise noté | Lien vidéo, commit remis et notes de revue | Équipe |
| Contrôler domaine, HTTPS, CORS, SMTP, GitHub et stockage | Valeurs non-développement injectées de manière sûre et intégrations testées | Checklist vérifiée, sans révéler de secret | À désigner |
| Tester la restauration, la supervision et la procédure de retour arrière | Reprise et surveillance démontrées en environnement contrôlé | Procès-verbal et métriques expurgés | À désigner |

Résultats au 6 novembre 2026 : [audit opérationnel](08-qualite-securite/audit-operationnel.md) et [état de préparation à la production](07-deploiement/etat-preparation-production.md). Les contrôles frontend et la suite backend passent localement ; aucun parcours métier complet n’a été exécuté dans le cadre de ces audits. Depuis, le site a répondu HTTP 200 en HTTPS et la vidéo a été fournie ; le contenu vidéo et les parcours métier complets restent à examiner.

## Avant la répétition jury

| Action | Résultat attendu | Preuve à conserver | Responsable |
|---|---|---|---|
| Archiver la preuve d’inscription du roster confirmé (Abdoulaye GAYE et Aliou DIOP), si demandée | Inscription et rôles vérifiables selon les règles | Confirmation de l’organisateur | Équipe |
| Finaliser les preuves de contribution de chaque membre | Rôles et apports confirmés ; fonctionnalité mot de passe oublié localisée et vérifiée avant démonstration | PR/commits, tâches, vidéo ou livrables vérifiables | Chaque membre |
| Compléter la déclaration IA selon les règles | Usages déclarés et relus par l’équipe ; autres usages éventuels et format officiel vérifiés | Déclaration à jour, période et relecture confirmées | Chaque membre |
| Auditer les licences directes et transitives | Liste complète avec rapports datés et revue des cas inconnus | Rapports Maven/npm et décision de conformité | Responsable technique/licences à désigner |
| Revoir la vidéo et répéter le scénario en direct | Parcours montrés identifiés, fonctionnement en direct reproduit | Compte rendu, captures sans données sensibles | Équipe |
| Préparer un mode dégradé | Démonstration de secours identifiée comme préenregistrée | Vidéo/captures, sans prétendre qu’elles prouvent la disponibilité en direct | À désigner |

## Compléments de documentation

1. Produire les guides utilisateurs manquants dans `docs/05-guides-utilisateur/` à partir de l’interface et de tests réels.
2. Revalider les endpoints API avec les mappings de tous les contrôleurs.
3. Générer un contrôle global de liens et chemins source avant remise.
4. Ajouter les résultats CI complets, la couverture si mesurée et les limites de chaque contrôle.
5. Rapprocher l’index racine et les index de section des fichiers réellement disponibles.

## Dernières étapes suggérées avant le 15 novembre

- Revoir la vidéo et confirmer les parcours qu’elle montre.
- Faire le dernier push documentaire, puis noter le commit exact remis au jury.
- Vérifier l’absence de secrets dans les fichiers soumis et relire la checklist de remise.
- Présenter les fonctions non retrouvées dans le code comme limites/non vérifiées, notamment le parcours mot de passe oublié.
- Conserver les preuves d’hébergement et d’inscription expurgées, et ne finaliser les points de licences que si requis ou avant toute déclaration de conformité.

Ce calendrier est un plan de travail recommandé, pas une prolongation ou un calendrier officiel.
