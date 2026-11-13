# Déploiement PostgreSQL

Le dépôt fournit un service PostgreSQL local via Docker Compose ; il correspond à un environnement de développement et non à une preuve de base de données prod.

## 1. Configuration observée

Le service est décrit dans [docker-compose.yml](../../docker-compose.yml) :

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: ${DB_NAME:-ndadiee}
      POSTGRES_USER: ${DB_USER:-ndadiee}
    ports:
      - "127.0.0.1:${DB_PORT:-5434}:5432"
```

La ligne du mot de passe est volontairement omise de l’extrait ; sa valeur par défaut de développement n’est pas reproduite.

## 2. Paramètres applicatifs

Dans [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml), le backend utilise :

- `jdbc:postgresql://localhost:5434/ndadiee`
- utilisateur `ndadiee`
- mot de passe fourni par la configuration locale (valeur non reproduite)

## 3. Risques évidents pour la production

- les identifiants de développement ne sont pas des valeurs de production,
- le port local n’est pas un port public de service,
- aucune sauvegarde automatisée n’est déclarée dans le dépôt,
- tous les profils utilisent `validate`; Flyway applique les versions disponibles avant la validation JPA.
- [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql) crée le schéma sur une base vide. Les migrations suivantes doivent être versionnées et immuables après application.
- une base historique sans `flyway_schema_history` doit être sauvegardée, comparée au schéma V1, puis baselinée manuellement en version 1. La baseline n'altère pas les tables ; Hibernate valide ensuite le schéma.
- `DatabaseConstraints` vérifie également l'index unique partiel des sprints ouverts, déjà présent dans V1, avec `CREATE UNIQUE INDEX IF NOT EXISTS`.

## 4. Recommandation de production

- utiliser un service PostgreSQL dédié avec stockage persistant et copie de sauvegarde,
- isoler la base du réseau public,
- définir des identifiants distincts pour l’application,
- mettre en place des sauvegardes chiffrées et régulières,
- tester les migrations sur une base isolée et sur une copie restaurée avant leur application sur une base durable.

## 5. Vérifications à faire avant mise en ligne

- accès réseau autorisé uniquement depuis le backend,
- test de connexion JDBC réussi,
- permissions correctes sur la base et les schémas,
- sauvegarde de la base planifiée,
- rétablissement d’un point de sauvegarde vérifié.

## Sources

- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [.env.example](../../.env.example)
