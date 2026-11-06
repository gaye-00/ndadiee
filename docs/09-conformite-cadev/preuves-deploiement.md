# Preuves de déploiement

## État constaté

Le dépôt contient un service PostgreSQL local dans [docker-compose.yml](../../docker-compose.yml) et les configurations Spring, R2 et frontend dans les fichiers de l’application. Aucun Dockerfile, manifeste cloud, URL publique, configuration TLS ou preuve d’hébergement Datacloud n’a été identifié dans l’arborescence inspectée.

**Statut : non vérifiable.** Cette conclusion ne signifie pas que l’équipe n’a jamais effectué de déploiement hors dépôt ; elle signifie que les preuves nécessaires ne sont pas disponibles ici.

## Preuves à fournir

- URL publique HTTPS du frontend ;
- endpoint public du backend et réponse vérifiable ;
- capture horodatée de la plateforme en ligne ;
- test d’accès depuis un réseau/compte externe à l’équipe ;
- démonstration d’authentification et d’un parcours métier ;
- preuve que la base et le stockage sont configurés et persistants, sans révéler de secret ;
- journal ou écran d’état de la plateforme d’hébergement ;
- nom de l’hébergeur et preuve de service Datacloud si cette exigence s’applique ;
- date/commit de la version déployée et procédure de mise à jour.

## Vérification de l’URL publique

Avant de la transmettre au jury :

1. vérifier que le domaine se résout depuis un réseau externe ;
2. confirmer le certificat HTTPS et l’absence d’erreur navigateur ;
3. vérifier le chargement du front, l’API, les routes protégées et les WebSockets ;
4. effectuer les parcours de démonstration ;
5. retirer des captures les données personnelles et secrets ;
6. enregistrer les résultats avec date, navigateur et commit déployé.

Voir [la procédure de mise en production](../07-deploiement/procedure-de-mise-en-production.md).
