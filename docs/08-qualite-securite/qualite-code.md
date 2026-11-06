# Qualité du code

## Éléments favorables observés

- Backend structuré par responsabilités Spring : contrôleurs, services, repositories, DTO, sécurité et entités. Voir [backend/src/main/java/com/hautetech/ndadiee](../../backend/src/main/java/com/hautetech/ndadiee).
- Présence de validations avec `@Valid` sur plusieurs points d'entrée, par exemple [AuthenticationController.java](../../backend/src/main/java/com/hautetech/ndadiee/authentication/AuthenticationController.java) et [ProjectController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/ProjectController.java).
- Gestion d'erreurs centralisée dans [GlobalExceptionHandler.java](../../backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java).
- Frontend organisé par pages, composants, hooks, services et types dans [frontend/src](../../frontend/src).
- Scripts de qualité front déclarés dans [frontend/package.json](../../frontend/package.json).
- Suite backend présente, notamment sur services métier et permissions.

## Vérifications réalisées

- Tests backend ciblés d'authentification, de sécurité admin et de sélection de stockage : réussis.
- Lint frontend : réussi.
- Vérification i18n : réussie.
- Aucun audit de couverture n'a été exécuté.
- Aucun profilage de performance ni test de charge n'a été exécuté.

## Problèmes et risques observables

| Fichier | Constat | Risque / priorité | Recommandation |
|---|---|---|---|
| [application.yaml](../../backend/src/main/resources/application.yaml), [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql) | Flyway V1 migre les bases vides ; Hibernate `validate` s'applique dans tous les profils. Le test de contexte valide la migration. | Compatibilité avec une base historique ou distante non démontrée ; élevée | Comparer une sauvegarde au schéma V1 et réaliser une baseline contrôlée avant mise en production |
| [frontend/package.json](../../frontend/package.json) | Aucun script de tests frontend déclaré | Régressions UI/parcours non détectées automatiquement ; moyenne | Ajouter une suite de tests frontend |
| [application-prod.yaml](../../backend/src/main/resources/application-prod.yaml) | Le profil prod fixe `ddl-auto=validate` et désactive les seeders, mais la datasource et le secret JWT restent injectés depuis l'environnement ; aucune migration versionnée n'est fournie | Configuration effective dépend de l'environnement et évolution de schéma non automatisée ; moyenne | Vérifier les variables runtime et ajouter une stratégie versionnée de migration |
| Manifestes Maven/npm | Aucun rapport de couverture ou d'advisories courant dans le dépôt | Dette d'assurance qualité ; moyenne | Ajouter des rapports CI reproductibles |

Ces constats sont des risques de configuration ou de couverture, pas des vulnérabilités exploitées.

## Recommandations de qualité

- Maintenir les contrôles de validation et d'autorisation au backend, indépendamment du frontend.
- Ajouter des tests de contrat front/back pour les DTO et les erreurs.
- Exécuter lint, build et suite de tests en intégration continue à chaque proposition de changement.
- Lier les changements de configuration à une documentation mise à jour.
