# Hébergement Datacloud

Ce document ne prétend pas établir qu’un hébergement Datacloud est actif pour Ndadiée. Aucun manifeste de déploiement, de service cloud, de configuration de VM ou de pipeline de publication n’a été trouvé dans le dépôt.

## 1. Preuve disponible dans le dépôt

Les fichiers observés montrent :

- un environnement de développement local,
- une base PostgreSQL locale via Docker Compose,
- une configuration de variables d’environnement,
- une architecture applicative cohérente,
- des dépendances S3/R2 et GitHub,
- mais aucune preuve de publication sur une plateforme cloud de production.

## 2. Ce qu’il faut collecter avant de prétendre à un déploiement Datacloud

- URL publique du projet,
- accès à l’interface web depuis Internet,
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

Le statut actuel est : non vérifié. Une déclaration de déploiement Datacloud ne peut être faite sans preuve publique et durable, disponible pour inspection.

## Sources

- [README.md](../../README.md)
- [docker-compose.yml](../../docker-compose.yml)
- [.env.example](../../.env.example)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
