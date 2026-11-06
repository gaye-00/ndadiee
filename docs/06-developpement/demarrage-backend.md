# Démarrage du backend

Le backend Ndadiée est un projet Spring Boot Java 21. La commande principale de démarrage est fournie dans [backend/README.md](../../backend/README.md) et le point de configuration est [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

## Commandes de base

### Démarrer le backend

```bash
cd backend
SPRING_PROFILES_ACTIVE=local JWT_SECRET="$(openssl rand -base64 48)" ./mvnw spring-boot:run
```

Flyway initialise une base vide depuis V1 et Hibernate valide le schéma (`ddl-auto=validate`) dans tous les profils. Pour une base locale existante sans historique Flyway, suivre la procédure de baseline de [Base de données](./base-de-donnees.md) avant de démarrer. Les seeders restent désactivés sauf opt-in explicite `SEED_ENABLED=true`. Si activés, configurer les trois mots de passe de seed. Sans `JWT_SECRET` Base64 valide (256 bits minimum), le backend échoue au démarrage.

### Compiler sans exécuter les tests

```bash
cd backend
./mvnw -DskipTests compile
```

### Lancer les tests backend

```bash
cd backend
./mvnw test
```

### Initialiser ou migrer le schéma local

Sur une base vide, Flyway applique les migrations versionnées automatiquement, puis Hibernate valide le schéma. Sur une base existante, la baseline manuelle doit être effectuée seulement après sauvegarde et comparaison à V1. Ne pas supprimer le volume pour résoudre un problème de démarrage.

```bash
docker compose up -d postgres
```

Pour tout test de migration, utiliser une base jetable explicitement isolée, jamais le volume local existant.

## Ports et endpoints observés

- backend : `http://localhost:8080`
- contexte applicatif : `/api`
- Swagger UI : `http://localhost:8080/api/swagger-ui.html`

## Configuration observée

Les éléments clés sont :

- datasource : PostgreSQL sur `localhost:5434/ndadiee`,
- CORS : `FRONTEND_URL`,
- JWT : `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRATION`, `JWT_REFRESH_TOKEN_EXPIRATION`,
- intégrations : GitHub, Cloudflare R2, e-mail,
- base de démo : `SEED_ENABLED` et mots de passe d’admin / démo.

## Bonnes pratiques

- Utiliser la base Docker locale avant d’exécuter le backend.
- Vérifier que le port `5434` est disponible avant de lancer le conteneur.
- Ne pas stocker de secrets réels dans le dépôt.
- Avant une mise en production, réviser la stratégie de génération du schéma et la gestion des secrets.

## Sources

- [backend/README.md](../../backend/README.md)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [backend/pom.xml](../../backend/pom.xml)
- [docker-compose.yml](../../docker-compose.yml)
