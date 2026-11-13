# Intégrations externes

## Vue d’ensemble

Le backend Ndadiée s’appuie sur plusieurs services tiers ou composants externes. Les intégrations sont encapsulées dans des packages dédiés et configurées via les variables d’environnement de [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

## GitHub API

### Rôle

L’intégration GitHub sert à :

- préremplir les informations d’un projet depuis un dépôt public ;
- lire les pulls requests et leurs vérifications ;
- afficher l’activité GitHub liée à un projet.

### Implémentation

- [backend/src/main/java/com/hautetech/ndadiee/github/GithubClient.java](../../backend/src/main/java/com/hautetech/ndadiee/github/GithubClient.java)
- [backend/src/main/java/com/hautetech/ndadiee/github/GithubConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/github/GithubConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/github/GithubProperties.java](../../backend/src/main/java/com/hautetech/ndadiee/github/GithubProperties.java)

Le client utilise REST pour les dépôts et la lecture de fichiers, et GraphQL pour les pull requests. Il précise un `User-Agent` et l’`X-GitHub-Api-Version` dans les requêtes. L’API est conditionnée par `GITHUB_TOKEN` : sans token, seulement les dépôts publics et les requêtes limitées sont disponibles.

### Limites

- aucune écriture sur GitHub,
- pas de support explicite des dépôts privés dans ce client,
- dépendance au quota une fois le token absent ;
- le code précise qu’il gère les erreurs GitHub via `GithubException`.

## Cloudflare R2 / S3

### Rôle

Le stockage de médias, en particulier des images de projet ou de profile, peut être hébergé dans un bucket Cloudflare R2 compatible S3.

### Implémentation

- [backend/src/main/java/com/hautetech/ndadiee/storage/StorageConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/StorageConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/storage/StorageProperties.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/StorageProperties.java)
- [backend/src/main/java/com/hautetech/ndadiee/storage/R2FileStorage.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/R2FileStorage.java)

La logique de sélection est claire :

- `STORAGE_PROVIDER=R2` impose un mode R2,
- `AUTO` choisit R2 si les variables sont présentées, sinon le disque local,
- `LOCAL` force le disque.

### Limites

- si le mode `R2` est forcé sans configuration, l’application refuse de démarrer ;
- en local, le stockage est sur disque et reste moins durable ou moins scalable qu’un service objet ;
- l’intégration est conforme à l’API S3, mais sans preuve de déploiement réel dans le dépôt.

## SMTP

### Rôle

Les e-mails sont utilisés pour les notifications de revue de code et d’événements métier liés à l’activité des membres.

### Implémentation

- [backend/src/main/java/com/hautetech/ndadiee/mail/MailConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/mail/MailConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/mail/MailProperties.java](../../backend/src/main/java/com/hautetech/ndadiee/mail/MailProperties.java)
- [backend/src/main/java/com/hautetech/ndadiee/mail/SmtpEmailSender.java](../../backend/src/main/java/com/hautetech/ndadiee/mail/SmtpEmailSender.java)

Les commentaires dans le code indiquent que les e-mails sont envoyés en production uniquement ; en environnement local, ils sont simplement journalisés sans réelles livraisons.

## PostgreSQL

### Rôle

Le stockage relationnel applicatif est PostgreSQL. Il sert de source de vérité pour comptes, projets, discussions, badges, workspace, forum, etc.

### Implémentation

- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [docker-compose.yml](../../docker-compose.yml)

Le service `postgres` est défini pour le développement local avec une base nommée `ndadiee` et des identifiants locaux définis par les valeurs par défaut de Docker Compose. Ces identifiants ne sont pas adaptés à la production.

## Autres services réels dans le dépôt

Le repo indique aussi :

- `springdoc-openapi` pour la documentation Swagger,
- `JavaMailSender` pour les notifications,
- `AWS SDK S3` pour Cloudflare R2,
- `STOMP` pour le temps réel.

## Constat de conformité / production

Le dépôt montre bien plusieurs intégrations réelles et clairement encapsulées. Toutefois, il n’y a pas de preuve vérifiable dans le dépôt d’un déploiement Datacloud complet ni d’une configuration de production validée. Il faut donc considérer ces services comme présents dans la base applicative, mais non totalement validés dans l’environnement de production.

## Fichiers sources examinés

- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/java/com/hautetech/ndadiee/github/GithubClient.java](../../backend/src/main/java/com/hautetech/ndadiee/github/GithubClient.java)
- [backend/src/main/java/com/hautetech/ndadiee/storage/StorageConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/StorageConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/storage/StorageProperties.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/StorageProperties.java)
- [backend/src/main/java/com/hautetech/ndadiee/mail/MailConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/mail/MailConfiguration.java)
- [backend/src/main/java/com/hautetech/ndadiee/mail/SmtpEmailSender.java](../../backend/src/main/java/com/hautetech/ndadiee/mail/SmtpEmailSender.java)

## Documentation associée

- [architecture-backend.md](architecture-backend.md)
- [architecture-securite.md](architecture-securite.md)
- [architecture-websocket.md](architecture-websocket.md)
- [diagrammes.md](diagrammes.md)
