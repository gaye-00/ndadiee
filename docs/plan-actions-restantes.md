# Plan des actions restantes

Échéance de référence : **15 novembre 2026**, selon le calendrier transmis par l’équipe. Le règlement et toute prolongation doivent être confirmés auprès de l’organisateur. Le plan ci-dessous n’affirme pas que les actions sont réalisées.

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
| Confirmer l’obligation exacte d’hébergement et le service Datacloud applicable | Exigence officielle comprise | Règlement/communication datée | À désigner par l’équipe |
| Déployer ou identifier l’instance réellement disponible | URL publique fonctionnelle, si déjà déployée, ou plan de livraison daté | URL HTTPS, capture datée, test d’accès externe | À désigner |
| Contrôler domaine, HTTPS, CORS, SMTP, GitHub et stockage | Valeurs non-développement injectées de manière sûre et intégrations testées | Checklist vérifiée, sans révéler de secret | À désigner |
| Tester la restauration, la supervision et la procédure de retour arrière | Reprise et surveillance démontrées en environnement contrôlé | Procès-verbal et métriques expurgés | À désigner |

Résultats au 6 novembre 2026 : [audit opérationnel](08-qualite-securite/audit-operationnel.md) et [état de préparation à la production](07-deploiement/etat-preparation-production.md). Les contrôles frontend et la suite backend passent localement ; aucun parcours métier complet ni déploiement public n’est validé.

## Avant la répétition jury

| Action | Résultat attendu | Preuve à conserver | Responsable |
|---|---|---|---|
| Confirmer le roster de 2 à 5 membres indiqué par le cadre transmis | Liste et rôles validés par les personnes | Confirmation d’équipe / inscription | Équipe |
| Établir la contribution de chaque membre | Attribution précise, cohérente et maîtrisée | PR, commits, tâches ou livrables vérifiables | Chaque membre |
| Faire confirmer la déclaration IA | Déclaration collective sincère, y compris « aucun usage » si applicable | Formulaire ou attestation selon règlement | Chaque membre |
| Auditer les licences directes et transitives | Liste complète avec rapports datés et revue des cas inconnus | Rapports Maven/npm et décision de conformité | Responsable technique/licences à désigner |
| Répéter le scénario de démonstration | Parcours fluide, fonctionnel et reproductible | Compte rendu, captures sans données sensibles | Équipe |
| Préparer un mode dégradé | Démonstration de secours identifiée comme préenregistrée | Vidéo/captures, sans prétendre qu’elles prouvent la disponibilité en direct | À désigner |

## Compléments de documentation

1. Produire les guides utilisateurs manquants dans `docs/05-guides-utilisateur/` à partir de l’interface et de tests réels.
2. Revalider les endpoints API avec les mappings de tous les contrôleurs.
3. Générer un contrôle global de liens et chemins source avant remise.
4. Ajouter les résultats CI complets, la couverture si mesurée et les limites de chaque contrôle.
5. Rapprocher l’index racine et les index de section des fichiers réellement disponibles.

## Ordre suggéré sur neuf jours

- **6–8 novembre** : confirmer règlement, équipe, hébergement et secrets ; décider du périmètre démontrable.
- **9–11 novembre** : exécuter les tests externes, régler les blocages, établir licences et déclaration IA.
- **12–13 novembre** : répéter la démonstration et préparer les preuves.
- **14 novembre** : gel du contenu remis, vérification des liens et répétition finale.
- **15 novembre** : remise/démonstration, sous réserve de confirmation du calendrier officiel.

Ce calendrier est un plan de travail recommandé, pas une prolongation ou un calendrier officiel.
