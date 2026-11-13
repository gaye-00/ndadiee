# Preuves de déploiement

## Éléments confirmés par l’équipe le 10 et le 11 novembre 2026

L’équipe confirme que Ndadiée est déployé à [https://ndadiee.com/](https://ndadiee.com/), que le site est accessible depuis un réseau extérieur avec un certificat HTTPS valide, et que le domaine ainsi qu’un service d’hébergement ont été achetés chez Systalink via Datacloud.

Deux captures transmises par l’équipe montrent le récapitulatif d’un serveur cloud avec :

- Ubuntu Server 24.04 LTS ;
- région Frankfurt 1 (DE-FRA1) ;
- 1 vCPU et 30 Go de stockage ;
- période affichée du 10 novembre au 1er décembre 2026 ;
- montant affiché de 4 248 FCFA pour la période, avec la remise CADEV26 ; le récapitulatif affiche également 9 125 FCFA pour le prochain mois.

L’équipe confirme également que la version en ligne, l’API, la base de données et les parcours principaux fonctionnent. Les deux membres indiquent avoir participé aux tests. La vidéo de démonstration fournie est [Ndadiée : la plateforme de collaboration des développeurs africains](https://youtu.be/Xv030XysB88).

Une copie locale est présente dans `videos/ndadiee_demo_bas.mp4` (181 499 229 octets, environ 173 MiB). Elle n’est pas incluse dans le dépôt Git ordinaire car elle excède la limite de 100 MiB par fichier appliquée par GitHub. Le lien YouTube est le moyen de partage retenu pour cette remise ; le fichier local reste non suivi.

Le 13 novembre 2026, une requête externe à `https://ndadiee.com/` a reçu une réponse HTTP 200 ; la négociation HTTPS a abouti avec la vérification TLS standard de `curl`. YouTube renvoie les métadonnées de la vidéo et son titre ; le lecteur du navigateur utilisé pour l’audit n’a pas pu décoder le flux. Le contenu de la vidéo n’a donc pas été inspecté intégralement, et les parcours API/base de données n’ont pas été rejoués indépendamment.

Les captures de souscription/configuration et les confirmations de l’équipe sont consignées comme éléments de preuve. Le dépôt ne contient toujours pas de manifeste de déploiement cloud, de Dockerfile applicatif ou de configuration d’hébergement permettant de reproduire le déploiement.

## Preuves à fournir

- lien de la [vidéo de démonstration](https://youtu.be/Xv030XysB88) et contrôle humain de son contenu avant remise ;
- endpoint public du backend et réponse vérifiable, si l’API est exposée séparément ;
- capture horodatée de la plateforme en ligne pour le dossier de candidature ;
- preuve de la version/du commit présenté dans la vidéo ;
- preuve que la base et le stockage sont configurés et persistants, sans révéler de secret ;
- journal ou écran d’état de la plateforme d’hébergement ;
- nom de l’hébergeur et preuve de service Datacloud si cette exigence s’applique ;
- date/commit de la version déployée et procédure de mise à jour.

L’équipe confirme l’accès HTTPS depuis l’extérieur ainsi que le fonctionnement de la version en ligne et de ses principaux composants. Le lien vidéo est maintenant disponible ; son titre et ses métadonnées ont été vérifiés, mais le lecteur utilisé pour l’audit n’a pas pu décoder la vidéo. Ne pas publier de facture complète, identifiants, adresse IP privée ou secrets ; conserver une preuve expurgée si nécessaire.

## Vérification de l’URL publique

Avant de la transmettre au jury :

1. vérifier que le domaine se résout depuis un réseau externe ;
2. confirmer le certificat HTTPS et l’absence d’erreur navigateur ;
3. vérifier le chargement du front, l’API, les routes protégées et les WebSockets ;
4. effectuer les parcours de démonstration ;
5. retirer des captures les données personnelles et secrets ;
6. enregistrer les résultats avec date, navigateur et commit déployé.

Voir [la procédure de mise en production](../07-deploiement/procedure-de-mise-en-production.md).
