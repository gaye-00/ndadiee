# Hébergement Datacloud

L’équipe a indiqué le 10 novembre 2026 avoir acheté le domaine `ndadiee.com` et un service d’hébergement auprès de Systalink via Datacloud. Elle a transmis des captures d’un récapitulatif de serveur. Ces informations sont attribuées à l’équipe ; elles ne constituent pas une vérification indépendante de l’état technique du service.

## 1. Preuve disponible dans le dépôt

Les fichiers observés dans le dépôt montrent :

- un environnement de développement local,
- une base PostgreSQL locale via Docker Compose,
- une configuration de variables d’environnement,
- une architecture applicative cohérente,
- des dépendances S3/R2 et GitHub,
- mais pas le processus technique de publication sur la plateforme cloud.

Les captures fournies affichent Ubuntu Server 24.04 LTS, région Frankfurt 1 (DE-FRA1), 1 vCPU, 30 Go de stockage, période du 10 novembre au 1er décembre 2026, 4 248 FCFA affichés pour cette période après remise CADEV26, et 9 125 FCFA affichés pour le prochain mois. Les captures n’établissent pas l’état de fonctionnement du serveur ou le lien technique entre celui-ci et `https://ndadiee.com/`.

## 2. Ce qu’il faut collecter avant de prétendre à un déploiement Datacloud

- vérification de l’URL publique déclarée : [https://ndadiee.com/](https://ndadiee.com/) ;
- preuve datée de l’accès à l’interface web depuis un réseau externe ;
- preuve d’authentification extérieure,
- capture d’écran de l’application en ligne,
- logs de service ou de serveur,
- preuve de base de données distante et de stockage objet effectif,
- documentation de la procédure de déploiement réelle.

## 3. Architecture candidat pour Datacloud

Les composants fortement compatibles avec une plateforme cloud de type Datacloud sont :

- VM ou service applicatif pour le backend,
- VM ou service applicatif pour le frontend,
- base PostgreSQL gérée ou auto-hébergée,
- bucket objet ou service de fichiers compatible S3,
- reverse proxy TLS,
- secrets gérés dans un système de gestion sécurisé.

## 4. Recommandation prudente

Le dépôt impose une distinction claire entre :

- ce qui est vérifiable dans le code,
- ce qui est seulement proposé comme architecture de production,
- ce qui nécessite une confirmation réelle de l’équipe et de l’environnement d’exécution.

## 5. Conclusion

Le statut est : **hébergement et URL déclarés par l’équipe, fonctionnement public non vérifié indépendamment**. Ne pas confondre captures de souscription avec preuve de disponibilité ou de fonctionnement.

## Sources

- [README.md](../../README.md)
- [docker-compose.yml](../../docker-compose.yml)
- [.env.example](../../.env.example)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
