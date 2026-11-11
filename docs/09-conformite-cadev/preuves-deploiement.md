# Preuves de déploiement

## Éléments confirmés par l’équipe le 10 et le 11 novembre 2026

L’équipe confirme que Ndadiée est déployé à [https://ndadiee.com/](https://ndadiee.com/), que le site est accessible depuis un réseau extérieur avec un certificat HTTPS valide, et que le domaine ainsi qu’un service d’hébergement ont été achetés chez Systalink via Datacloud.

Deux captures transmises par l’équipe montrent le récapitulatif d’un serveur cloud avec :

- Ubuntu Server 24.04 LTS ;
- région Frankfurt 1 (DE-FRA1) ;
- 1 vCPU et 30 Go de stockage ;
- période affichée du 10 novembre au 1er décembre 2026 ;
- montant affiché de 4 248 FCFA pour la période, avec la remise CADEV26 ; le récapitulatif affiche également 9 125 FCFA pour le prochain mois.

L’équipe confirme également que la version en ligne, l’API, la base de données et les parcours principaux fonctionnent. Les deux membres indiquent avoir participé aux tests. Une vidéo de démonstration doit illustrer ces éléments ; son lien n’a pas encore été communiqué.

Les captures de souscription/configuration et les confirmations de l’équipe sont consignées comme preuves déclaratives. **La démonstration vidéo et une vérification indépendante de l’instance n’ont pas encore été réalisées dans cette revue.** Le dépôt ne contient toujours pas de manifeste de déploiement cloud, de Dockerfile applicatif ou de configuration d’hébergement permettant de reproduire le déploiement.

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

L’équipe confirme l’accès HTTPS depuis l’extérieur ainsi que le fonctionnement de la version en ligne et de ses principaux composants. Le lien de la vidéo de démonstration reste à fournir pour conserver une preuve consultable des parcours, de l’API et de l’utilisation de la base. Ces confirmations n’ont pas été contrôlées indépendamment dans cette revue. Ne pas publier de facture complète, identifiants, adresse IP privée ou secrets ; conserver une preuve expurgée si nécessaire.

## Vérification de l’URL publique

Avant de la transmettre au jury :

1. vérifier que le domaine se résout depuis un réseau externe ;
2. confirmer le certificat HTTPS et l’absence d’erreur navigateur ;
3. vérifier le chargement du front, l’API, les routes protégées et les WebSockets ;
4. effectuer les parcours de démonstration ;
5. retirer des captures les données personnelles et secrets ;
6. enregistrer les résultats avec date, navigateur et commit déployé.

Voir [la procédure de mise en production](../07-deploiement/procedure-de-mise-en-production.md).
