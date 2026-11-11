# Bilan de la documentation Ndadiée

## Portée de la revue

Revue globale effectuée le 6 novembre 2026 sur le README racine et les sections `docs/01-presentation/` à `docs/09-conformite-cadev/`, avec contrôles automatisés des liens relatifs et des chemins source reconnaissables. La revue a aussi confronté des affirmations clés aux manifestes de dépendances, aux routes frontend et aux configurations backend.

Elle n’est pas une relecture ligne par ligne de chaque assertion métier ni une validation du règlement officiel. La documentation reste subordonnée au code et aux preuves d’exécution.

## Documents créés pour la finalisation

- [docs/bilan-documentation.md](./bilan-documentation.md) — ce bilan.
- [docs/plan-actions-restantes.md](./plan-actions-restantes.md) — actions priorisées avant la date limite communiquée.
- [docs/checklist-finale-cadev.md](./checklist-finale-cadev.md) — contrôles à cocher avec preuves.
- [docs/scenario-demonstration.md](./scenario-demonstration.md) — scénario de démonstration conditionnel aux parcours réellement accessibles.

Le [README racine](../README.md) a été réorganisé pour présenter la stack, le démarrage local, les vérifications disponibles et les limites de production. Plusieurs incohérences transversales ont également été corrigées.

La configuration backend a été durcie : clé JWT obligatoire, seeders opt-in, Flyway activé avec migration initiale V1 et Hibernate `validate` dans tous les profils. Une base historique exige une baseline explicite après sauvegarde et comparaison.

L’audit opérationnel et la phase de durcissement du 6 novembre 2026 ont actualisé l’[audit opérationnel](./08-qualite-securite/audit-operationnel.md), l’[état de préparation à la production](./07-deploiement/etat-preparation-production.md) et le [plan d’actions](./plan-actions-restantes.md). JWT, seeders et schéma ont été durcis ; Flyway V1 et sa procédure de baseline ont été ajoutés et testés sur PostgreSQL temporaire. La suite backend (313 tests) et les contrôles frontend réussissent. La compatibilité avec la base réelle et les preuves de déploiement restent à établir.

## Sections vérifiées

- `docs/01-presentation/` : positionnement et limites de preuve.
- `docs/02-architecture/` : vérification ciblée de noms de services, configurations et chemins.
- `docs/03-fonctionnalites/` et `docs/matrice-fonctionnalites.md` : harmonisation du statut GitHub et distinction code/production.
- `docs/04-api/` et `docs/faq.md` : réparation du lien vers l’index API et correction de l’affirmation de test d’intégration.
- `docs/05-guides-utilisateur/` : dossier présent mais vide.
- `docs/06-developpement/` : réparation du chemin des modèles et correction terminologique.
- `docs/07-deploiement/` : vérification des affirmations Docker, TLS et Datacloud ; aucune preuve d’hébergement n’a été trouvée ; configuration durcie, stratégie Flyway et résultats des tests ajoutés.
- `docs/08-qualite-securite/` : rapprochement entre tests déclarés et commandes réellement exécutées ; audit opérationnel mis à jour après les corrections et tests.
- `docs/07-deploiement/` et `docs/08-qualite-securite/` : audit opérationnel, résultats de tests et état réel de préparation à la production.
- `docs/09-conformite-cadev/` : statuts et réserves concernant l’équipe, l’IA, les licences et le déploiement.

### Mise à jour des 10 et 11 novembre 2026

L’équipe a confirmé les informations désormais intégrées aux documents CADEV et de déploiement : deux membres inscrits (Abdoulaye GAYE et Aliou DIOP), utilisation de Claude par Abdoulaye pour des composants backend, utilisation de ChatGPT et GitHub Copilot pendant la recherche et le développement pour améliorer la documentation, et relecture des résultats par les deux membres avec une vérification supplémentaire d’Aliou. Les membres indiquent tous deux avoir participé aux tests ; Aliou a contribué à l’audit fonctionnel et suggéré le parcours « mot de passe oublié », qu’Abdoulaye déclare avoir ajouté.

L’équipe confirme également que [https://ndadiee.com/](https://ndadiee.com/) est accessible depuis l’extérieur avec un certificat HTTPS valide et que la version en ligne, l’API, la base et les principaux parcours fonctionnent. Une vidéo doit le démontrer ; le lien n’a pas encore été communiqué. Les captures Systalink/Datacloud et informations sur le service ont également été enregistrées. L’équipe confirme que le cadre de concours résumé dans le dossier correspond aux conditions reçues.

Ces éléments sont des confirmations de l’équipe et des informations fournies ; elles ne sont pas des vérifications techniques indépendantes. Le parcours de récupération du mot de passe n’a pas été retrouvé dans le code examiné. Le lien vidéo, les détails de cette contribution et tout justificatif officiel éventuellement demandé restent à fournir. Le partage 50/50 du prix en cas de victoire reste une intention déclarée à confirmer par les membres et au regard du règlement.

## Corrections principales

1. README racine : version alignée sur Spring Boot 4.1.1 déclarée dans `backend/pom.xml`; liens documentaires remplacés par des chemins présents.
2. `docs/faq.md` : lien vers `docs/04-api/README.md` corrigé ; le test global n’est plus présenté comme exécuté.
3. Architecture DB/intégrations : service Docker nommé `postgres`, et non `db`.
4. Structure du projet : entités sous `model/`, et non un répertoire `entity/` inexistant.
5. Matrice fonctionnelle : intégration GitHub indiquée partiellement implémentée. Les usages IA et contributions déclarés par les membres sont maintenant consignés, avec les limites non vérifiées explicitées.
6. Matrice CADEV : l’incohérence de version et les liens racine déjà corrigés sont signalés comme tels, non comme défauts encore ouverts.
7. Index documentaire : références vers les guides utilisateur absents signalées au lieu de renvoyer vers des fichiers fictifs.

## Contrôles de liens et chemins

- Contrôle global après les ajouts de l’audit opérationnel : 113 fichiers Markdown (index et README racine inclus), zéro lien relatif cassé et zéro espace final.
- Contrôle des chemins source reconnaissables : zéro chemin absent après correction des références identifiées.
- Aucun doublon Markdown exact ni fichier Markdown vide détecté.
- `docs/05-guides-utilisateur/` ne contient aucun fichier Markdown ; cette absence est documentée et reste un manque de livrable.
- Le scénario final a été rapproché des routes réelles dans [router/index.tsx](../frontend/src/router/index.tsx) et [paths.ts](../frontend/src/router/paths.ts). Les écrans d’inscription et de réglages cités existent dans [RegisterPage.tsx](../frontend/src/pages/auth/RegisterPage.tsx) et [SettingsPage.tsx](../frontend/src/pages/settings/SettingsPage.tsx). Les étapes restent conditionnelles aux essais sur l’instance de démonstration.
- Le chevauchement entre la checklist de synthèse et la checklist détaillée a été réduit : [checklist-finale-cadev.md](./checklist-finale-cadev.md) sert à l’approbation finale et renvoie aux preuves détaillées de [checklist-livrables.md](./09-conformite-cadev/checklist-livrables.md).
- Les valeurs littérales des clés JWT et des comptes/mots de passe de démonstration ne sont pas reproduites dans les rapports opérationnels ; les documents de configuration locale qui les recopiaient ont été expurgés.

## Documents manquants ou incomplets

- `docs/05-guides-utilisateur/` ne contient aucun fichier. Les guides utilisateur détaillés attendus précédemment restent à produire ; les pages fonctionnelles ne sont pas un substitut à des procédures simplifiées.
- Aucun rapport d’audit transitif des licences n’est présent.
- Les noms des deux membres, les usages d’IA, l’URL publique, l’accès HTTPS et le bon fonctionnement des principaux composants sont confirmés par l’équipe. Le lien vidéo annoncé et la vérification indépendante des parcours restent à obtenir. Le parcours « mot de passe oublié » déclaré ajouté par Abdoulaye est absent du code examiné.
- Le dossier de conformité repose sur le cadre communiqué dans la demande ; il ne valide pas de façon indépendante le règlement ou ses éventuels avenants.
- La cohérence de toutes les descriptions d’endpoints avec chaque contrôleur n’a pas été entièrement re-auditée dans cette revue finale.

## État de preuve

### Établi dans le dépôt ou par exécution locale

- Application backend Java/Spring et frontend React/TypeScript.
- PostgreSQL local via Docker Compose.
- Code des parcours métier, contrôles d’accès et intégrations décrits par les documents spécialisés.
- Backend durci : clé JWT requise et validée ; seeders désactivés par défaut et sans mots de passe de repli ; Flyway V1 active et Hibernate `validate` partout.
- Migration V1 appliquée sur PostgreSQL 17 vide ; baseline version 1 et validation du schéma testées sur une base historique temporaire. Le test de baseline a laissé inchangés 0 utilisateur et 7 badges.
- Tests backend du 6 novembre 2026 sur PostgreSQL 17 temporaire sans volume : 313 tests, 0 échec, 0 erreur, 0 ignoré, incluant la vérification des comptes de démonstration sous le profil `prod`.
- `npm run build`, `npm run lint` et `npm run i18n:check` exécutés avec succès.
- Le conteneur temporaire a été supprimé et le volume PostgreSQL préexistant est resté intact.

### Non établi

- Vérification indépendante de l’accessibilité et du fonctionnement du produit ; lien de la vidéo de démonstration annoncé mais non reçu.
- Détails des contributions individuelles et preuve du parcours « mot de passe oublié » déclaré ajouté, absent du code examiné.
- Exhaustivité des usages IA (autres usages éventuels pour tests ou médias) et conformité au format officiel de déclaration, s’il est imposé.
- conformité légale complète des licences transitives.
- exécution des parcours métier end-to-end, mesure de couverture ou test de charge.

## Priorités

Avant le 15 novembre 2026, traiter d’abord : comparer V1 à une sauvegarde de la base cible et effectuer une baseline contrôlée si elle correspond ; vérifier variables et données de l’environnement cible ; récupérer la vidéo promise et les preuves des parcours ; localiser/vérifier la récupération de mot de passe déclarée ; finaliser l’inventaire licences/IA ; enfin produire les guides utilisateur et répéter le scénario. Voir [le plan d’actions](./plan-actions-restantes.md).
