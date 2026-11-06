# FAQ Ndadiée

## 1. Qu’est-ce que Ndadiée ?
Ndadiée est une plateforme communautaire de développement, orientée autour des projets, du forum, des revues de code, de l’espace d’équipe et des profils de développeurs.

## 2. Quel est le type de projet ?
Le dépôt est un monolithe Java / Spring Boot backend et React / TypeScript frontend.

## 3. La base de données est-elle PostgreSQL ?
Oui, le `docker-compose.yml` démarre un service PostgreSQL 17. Les propriétés de connexion sont définies dans [backend/src/main/resources/application.yaml](../backend/src/main/resources/application.yaml).

## 4. Le backend utilise-t-il JWT ?
Oui. La sécurité est construite autour de JWT avec token d’accès et token de rafraîchissement. Voir [backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java](../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java).

## 5. Le projet est-il mobile ?
Le frontend est conçu pour un accès web moderne ; le dépôt ne contient pas de client mobile natif distinct.

## 6. Y a-t-il un système de déploiement Datacloud dans le dépôt ?
Pas à ce jour, au moins pas de preuve vérifiable dans le repository. La documentation de déploiement doit donc distinguer ce qui est testé et ce qui reste à mettre en place.

## 7. Y a-t-il des tests automatisés ?
Oui, le dépôt contient des tests backend dans `backend/src/test/java`. Le test de démarrage `NdadieeApplicationTests` indique qu’il a besoin de PostgreSQL local. La suite backend complète n’est pas déclarée exécutée dans cette documentation ; des tests ciblés d’authentification, de sécurité admin et de stockage ont été exécutés avec succès pendant l’audit. Voir [la stratégie de tests](08-qualite-securite/strategie-de-tests.md).

## 8. Le projet est-il prêt pour la production ?
Le projet a une bonne base fonctionnelle, mais la configuration production, la migration de schéma, la sécurisation et la conformité réglementaire restent à finaliser.

## 9. Où trouver la documentation ?
Dans le dossier [docs/](README.md).

## 10. Les routes API sont-elles documentées dans le code ?
Les routes sont définies par les contrôleurs backend et la documentation OpenAPI est configurée. La documentation de référence du dépôt est dans [docs/04-api](04-api/README.md).
