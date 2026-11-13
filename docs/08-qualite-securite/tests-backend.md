# Tests backend

## Organisation observée

Les tests sont sous [backend/src/test/java](../../backend/src/test/java). L'inventaire local compte 46 fichiers Java, portant sur des tests unitaires avec JUnit/Mockito, des tests MVC de sécurité et des tests de démarrage Spring.

Exemples de domaines couverts :

- authentification : [AuthenticationServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/authentication/AuthenticationServiceTest.java)
- restrictions du back-office : [AdminSecurityTest.java](../../backend/src/test/java/com/hautetech/ndadiee/controller/AdminSecurityTest.java)
- fichiers et stockage : [ImageUploadServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/media/ImageUploadServiceTest.java), [StorageConfigurationTest.java](../../backend/src/test/java/com/hautetech/ndadiee/storage/StorageConfigurationTest.java)
- GitHub : [GithubClientTest.java](../../backend/src/test/java/com/hautetech/ndadiee/github/GithubClientTest.java)
- contexte applicatif et absence de données démo : [NdadieeApplicationTests.java](../../backend/src/test/java/com/hautetech/ndadiee/NdadieeApplicationTests.java), [ProductionSeedSafetyTest.java](../../backend/src/test/java/com/hautetech/ndadiee/initializer/ProductionSeedSafetyTest.java)
- validation de la clé JWT : [JwtServiceConfigurationTest.java](../../backend/src/test/java/com/hautetech/ndadiee/security/JwtServiceConfigurationTest.java)

## Commandes

```bash
cd backend
./mvnw test
```

Le test de contexte documente explicitement sa dépendance à PostgreSQL local. Pour les vérifications ciblées sans lancer la suite complète :

```bash
./mvnw -Dtest=AdminSecurityTest,AuthenticationServiceTest,StorageConfigurationTest test
```

## Résultats exécutés le 6 novembre 2026

La suite complète `./mvnw test` a été exécutée le 6 novembre 2026 contre PostgreSQL 17 temporaire, sans volume partagé. Flyway a appliqué V1 automatiquement et Hibernate a validé le schéma. Résultat Surefire : **313 tests, 0 échec, 0 erreur, 0 ignoré**. Les tests de contexte et les assertions d'absence des comptes de démonstration sous les profils `test` et `prod` ont réussi. Le conteneur temporaire a ensuite été supprimé ; le volume PostgreSQL du projet n'a pas été utilisé.

Une tentative antérieure sans base accessible a échoué au chargement du contexte. Ce résultat historique n'est pas l'état final de la suite.

Une tentative antérieure avait échoué faute de conteneur PostgreSQL encore actif ; la suite complète a ensuite été relancée avec succès sur une instance jetable neuve.

Les tests ciblés d'authentification, de sécurité d'administration et de stockage appartiennent aux tests qui passent dans l'exécution de la suite. Ils ne remplacent pas le test de contexte ni un test HTTP de bout en bout.

## Améliorations recommandées

- Exécuter `./mvnw test` dans une CI sur une instance PostgreSQL jetable et obtenir zéro erreur.
- Ajouter des tests d'intégration ciblés sur le cycle JWT complet, les validations HTTP et les règles de propriété des ressources.
- Ajouter une vérification d'authentification et d'autorisation STOMP.
- Publier les rapports Surefire et de couverture en CI.
- Revoir les avertissements de runtime observés pendant les tests, notamment le chargement dynamique de l'agent Mockito avec les versions futures du JDK.
