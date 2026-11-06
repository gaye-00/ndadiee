# Base de données

Ndadiée utilise PostgreSQL pour le stockage principal. Le conteneur local est défini dans [docker-compose.yml](../../docker-compose.yml) et les paramètres d’accès sont fournis par [.env.example](../../.env.example) et [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

## Configuration locale

Le service Docker défini par le dépôt :

- image : `postgres:17`
- base : `ndadiee`
- utilisateur : `ndadiee`
- mot de passe : valeur de développement non reproduite
- port publie : `5434` sur l’hôte local

## Paramètres de connexion observés

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5434/ndadiee}
    username: ${SPRING_DATASOURCE_USERNAME:ndadiee}
```

La propriété `password` est volontairement omise de l’extrait ; utiliser une valeur locale dédiée et ne pas la publier.

## Schéma et migrations

Flyway applique [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql) au démarrage d'une base vide. Hibernate utilise `ddl-auto=validate` dans tous les profils et ne crée ni ne modifie les tables. Les tests de contexte utilisent aussi cette migration et valident le schéma.

Pour une base existante sans `flyway_schema_history` :

1. Réaliser et vérifier une sauvegarde restaurable.
2. Comparer le schéma existant à V1 et résoudre toute différence avant de continuer.
3. Définir `FLYWAY_URL`, `FLYWAY_USER` et `FLYWAY_PASSWORD` pour la base cible.
4. Depuis `backend/`, lancer `FLYWAY_BASELINE_VERSION=1 ./mvnw flyway:baseline`.
5. Démarrer l'application et vérifier que Flyway et Hibernate valident le schéma.

La baseline enregistre uniquement le niveau de version et ne modifie pas les tables métier. Ne pas l'utiliser avant d'avoir confirmé que le schéma correspond à V1. La baseline automatique est volontairement désactivée. Les évolutions ultérieures doivent ajouter des fichiers V2, V3, etc. ; ne jamais réécrire une migration déjà appliquée.

## Démarrage

```bash
docker compose up -d postgres
```

Ne pas effacer le volume pour corriger un échec applicatif. Les tests de contexte doivent utiliser une base temporaire, distincte du volume local. Une base neuve reçoit V1 automatiquement ; une base historique doit être explicitement baselinée comme décrit ci-dessus.

## Bonnes pratiques de développement

- Garder les scripts de démonstration dans un contexte local uniquement.
- Ne pas utiliser des secrets réels dans les variables de base de données.
- Vérifier la compatibilité des nouvelles migrations sur une base jetable et sur une copie restaurée avant production.
- Créer des versions de migration additives et réversibles lorsque c'est possible ; préserver les données existantes.

## Sources

- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [backend/README.md](../../backend/README.md)
