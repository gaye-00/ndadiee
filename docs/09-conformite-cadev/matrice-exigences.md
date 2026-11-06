# Matrice des exigences CADEV

## États utilisés

- **Conforme et prouvé** : exigence satisfaite et preuve vérifiable disponible.
- **Partiellement conforme** : une partie est satisfaite ou prouvée, mais un élément essentiel manque.
- **Non conforme** : preuve disponible établissant que l’exigence n’est pas satisfaite.
- **Non vérifiable** : les informations ou preuves nécessaires ne sont pas disponibles. Ce statut ne signifie ni conformité ni non-conformité.

Les exigences ci-dessous reprennent le cadre transmis par l’équipe. Le règlement officiel n’a pas été vérifié indépendamment.

| Exigence | Description | État | Preuve | Fichier ou URL associé | Écart éventuel | Action corrective | Responsable, si connu |
|---|---|---|---|---|---|---|---|
| Adéquation au thème | Construire une plateforme d’échange africaine par et pour les devs | Partiellement conforme | Plusieurs domaines produit cohérents dans le code ; pas de preuve d’usage public | [fonctionnalités](../03-fonctionnalites/README.md), [routes UI](../../frontend/src/router/index.tsx) | Impact, utilisateurs et déploiement non démontrés | Présenter parcours réels et retours utilisateurs vérifiables | À confirmer |
| Période du concours | Développement du 29 septembre au 15 novembre 2026, selon le cadre transmis | Non vérifiable | Des commits locaux datés d’octobre 2026 existent ; ils ne prouvent pas l’historique complet ni l’origine de chaque contribution | [dépôt distant configuré](https://github.com/gaye-00/ndadiee) (accès public non vérifié) | Le dépôt seul ne prouve ni le début ni la fin du travail ni le respect des règles | Conserver l’historique remis, les horodatages et les confirmations de l’organisateur | À confirmer |
| Taille de l’équipe | 2 à 5 personnes selon le cadre transmis | Non vérifiable | Aucun roster vérifiable dans les éléments examinés | À fournir par l’équipe | Membres et statut de chacun inconnus | Fournir noms, rôles et preuve d’inscription à l’équipe, selon les règles | À confirmer |
| Dépôt Git | Dépôt du code | Partiellement conforme | Dépôt local présent et remote Git configuré | [racine du dépôt](../../README.md) ; `origin` observé comme `gaye-00/ndadiee` | Accessibilité publique et état du dépôt à la date de remise non validés | Tester l’accès depuis un compte externe et fournir l’URL au jury | À confirmer |
| Démonstration en ligne | Démonstration accessible en ligne | Non vérifiable | Aucune URL publique ou capture d’un environnement en ligne fournie | [preuves de déploiement](./preuves-deploiement.md) | La démonstration publique n’est pas attestée | Déployer, tester depuis l’extérieur et archiver les preuves | À confirmer |
| Projet utilisable et hébergé | Application accessible et utilisable sur un hébergement | Non vérifiable | Le dépôt contient une configuration locale PostgreSQL, pas de preuve d’hébergement | [docker-compose local](../../docker-compose.yml), [déploiement](../07-deploiement/README.md) | Aucun environnement réel certifié | Fournir URL, tests d’accès, captures et preuves de fonctionnement | À confirmer |
| Preuves fonctionnelles | Parcours réellement opérationnels | Partiellement conforme | Pages et fonctions correspondantes dans le code ; tests backend ciblés exécutés | [preuves fonctionnelles](./preuves-fonctionnelles.md) | Les tests locaux ne prouvent pas le parcours en production | Effectuer et enregistrer les parcours sur l’instance publique | À confirmer |
| Qualité technique | Architecture, build et tests reproductibles | Partiellement conforme | Backend Java/Spring, frontend React/TS, tests Java, build et lint front vérifiés | [preuves techniques](./preuves-techniques.md) | Suite backend complète/CI, couverture et tests UI non attestés | Ajouter résultats CI, couverture et tests de parcours | À confirmer |
| Usage de l’IA | Déclaration si le concours la requiert | Non vérifiable | Aucune déclaration complète d’équipe ou historique exhaustif fourni | [déclaration d’usage IA](./declaration-usage-ia.md) | Outils et contributions humaines durant le projet non confirmés | Faire confirmer l’inventaire par toute l’équipe | À confirmer |
| Licences logicielles | Licences directes et transitives conformes au règlement, si applicable | Non vérifiable | Manifestes et lockfiles présents, mais pas de rapport de licences exhaustif | [audit licences](./audit-licences.md), [pom.xml](../../backend/pom.xml), [package.json](../../frontend/package.json) | Licences transitives et clauses à analyser | Exécuter un inventaire transitif et valider contre les règles du concours | À confirmer |
| Déclaration de déploiement Datacloud | Service du concours à utiliser si requis par le cadre complet | Non vérifiable | Aucune preuve d’hébergement Datacloud | [hébergement Datacloud](../07-deploiement/hebergement-datacloud.md) | Pas d’URL ni preuve opérateur | Confirmer l’exigence, déployer si applicable, archiver les preuves | À confirmer |

## Lecture de la matrice

Aucune ligne n’est considérée « conforme et prouvée » sur la base de simples intentions ou d’une architecture proposée. Les preuves attendues doivent être jointes ou référencées par URL et date.
