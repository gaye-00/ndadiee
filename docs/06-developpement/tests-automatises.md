# Tests automatisés

Le dépôt contient des dépendances de test dans [backend/pom.xml](../../backend/pom.xml) et des scripts de validation dans [frontend/package.json](../../frontend/package.json). Les commandes suivantes sont celles qui semblent directement prises en charge par le projet.

## Backend

### Lancer les tests Java

```bash
cd backend
./mvnw test
```

Les dépendances test visibles dans le `pom.xml` incluent :

- `spring-boot-starter-data-jpa-test`
- `spring-boot-starter-security-test`
- `spring-boot-starter-validation-test`
- `spring-boot-starter-webmvc-test`

## Frontend

### Vérification de build et types

```bash
cd frontend
npm run build
```

### Vérification de lint

```bash
cd frontend
npm run lint
```

### Vérification des traductions

```bash
cd frontend
npm run i18n:check
```

## Ce qui n’a pas été vérifié de manière explicite

- le dépôt ne documente pas de suite de couverture standard,
- le niveau de couverture de tests n’est pas détaillé dans les fichiers observés,
- le projet ne fournit pas de rapport de qualité automatisé visible dans le dépôt.

## Recommandation

Avant une mise en production ou une validation de recette, prévoir :

- un jeu de tests backend ciblé sur sécurité, authentification et intégration,
- un jeu de tests frontend sur les parcours critiques,
- une mesure de couverture avec un outil dédié,
- une validation CI habituelle sur chaque branche et chaque PR.

## Sources

- [backend/pom.xml](../../backend/pom.xml)
- [frontend/package.json](../../frontend/package.json)
- [backend/README.md](../../backend/README.md)
- [frontend/README.md](../../frontend/README.md)
