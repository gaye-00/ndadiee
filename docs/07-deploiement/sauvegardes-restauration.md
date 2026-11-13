# Sauvegardes et restauration

Le dépôt décrit un environnement local PostgreSQL et un stockage de fichiers en mode local ou R2, mais il ne fournit pas de politique de sauvegarde définie ni de procédure de restauration documentée.

## 1. Ce qui est observé

- [docker-compose.yml](../../docker-compose.yml) monte un volume nommé `postgres_data`.
- Flyway applique les migrations versionnées depuis [backend/src/main/resources/db/migration](../../backend/src/main/resources/db/migration), puis Hibernate valide le schéma.
- [.env.example](../../.env.example) donne les paramètres de base et de stockage.

## 2. Ce qui manque

- pas de plan explicite de sauvegarde PostgreSQL,
- pas d’outil de snapshot ou de backup automatisé,
- pas de procédure de restauration documentée,
- pas de politique de sauvegarde des objets R2.

## 3. Recommandation de base

### PostgreSQL

- effectuer des sauvegardes quotidiennes ou à chaque version majeure,
- stocker les dumps dans un système externe chiffré,
- tester la restauration sur un environnement de test,
- conserver plusieurs points de restauration.

### Stockage objet

- sauvegarder le contenu non transactionnel du bucket,
- conserver les métadonnées associées aux objets,
- sécuriser l’accès aux données sensibles.

## 4. Procédure de reprise recommandée

```bash
# dump PostgreSQL
pg_dump -U ndadiee -d ndadiee > backup.sql

# restauration
psql -U ndadiee -d ndadiee < backup.sql
```

## 5. Checklist de production

- sauvegardes automatiques actives,
- validation de restauration dans un environnement secondaire,
- tests de reprise sur des jeux de données réalistes,
- vérification de la cohérence entre base et objets stockés,
- journal des restaurations.

## Sources

- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [.env.example](../../.env.example)
