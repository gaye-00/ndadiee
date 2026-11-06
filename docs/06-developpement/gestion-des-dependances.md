# Gestion des dépendances

Le projet gère ses dépendances côté backend avec Maven et côté frontend avec npm.

## Backend

Le fichier de référence est [backend/pom.xml](../../backend/pom.xml).

### Outils et catégories de dépendances

- Spring Boot starters : sécurité, JPA, validation, Web MVC, mail, WebSocket,
- PostgreSQL driver,
- Lombok,
- MapStruct,
- jjwt,
- springdoc-openapi,
- AWS SDK S3.

### Vérification utile

```bash
cd backend
./mvnw dependency:tree
```

et, si besoin :

```bash
./mvnw versions:display-dependency-updates
```

## Frontend

Le fichier de référence est [frontend/package.json](../../frontend/package.json).

### Vérification utile

```bash
cd frontend
npm ls --depth=0
```

ou pour inspecter les mises à jour :

```bash
npm outdated
```

## Recommandations de maintenance

- Vérifier régulièrement les dépendances liées à la sécurité.
- Contrôler les licences transitives avant toute mise en production.
- Conserver un lockfile (
  [backend/package-lock.json](../../backend/package-lock.json) et [frontend/package-lock.json](../../frontend/package-lock.json)
  ) pour la reproductibilité.
- Ne pas activer de nouvelles dépendances sans évaluation de leurs impacts sur la sécurité et la taille du bundle.

## Limites observées

Le dépôt ne contient pas, dans les fichiers examinés, de rapport de conformité explicite des licences ou d’audit des dépendances transitives. Ce point doit être complété par l’équipe avant une mise en production formelle.

## Sources

- [backend/pom.xml](../../backend/pom.xml)
- [frontend/package.json](../../frontend/package.json)
- [backend/package-lock.json](../../backend/package-lock.json)
- [frontend/package-lock.json](../../frontend/package-lock.json)
