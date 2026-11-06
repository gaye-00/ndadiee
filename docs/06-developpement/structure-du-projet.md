# Structure du projet

Le dépôt est divisé en deux grandes briques applicatives : un backend Java/Spring Boot et un frontend React/Vite.

## Vue d’ensemble du dépôt

```text
ndadiee/
├── backend/
│   ├── src/
│   ├── mvnw
│   ├── pom.xml
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
├── docs/
├── docker-compose.yml
├── .env.example
├── README.md
├── package-lock.json
└── backend/package-lock.json
```

## Backend

Le backend est localisé dans [backend/](../../backend/). Il contient :

- `src/main/java` : code applicatif Java,
- `src/main/resources` : configuration Spring, fichiers YAML,
- `src/test/java` : tests backend,
- `pom.xml` : dépendances Maven et configuration du build,
- `mvnw` : wrapper Maven pour lancer le projet sans installation globale.

Les points d’entrée principaux sont :

- configuration globale : [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- sécurité : [backend/src/main/java/com/hautetech/ndadiee/security](../../backend/src/main/java/com/hautetech/ndadiee/security)
- contrôleurs : [backend/src/main/java/com/hautetech/ndadiee/controller](../../backend/src/main/java/com/hautetech/ndadiee/controller)
- services : [backend/src/main/java/com/hautetech/ndadiee/service](../../backend/src/main/java/com/hautetech/ndadiee/service)
- modèles et entités / persistance : [backend/src/main/java/com/hautetech/ndadiee/model](../../backend/src/main/java/com/hautetech/ndadiee/model)

## Frontend

Le frontend est localisé dans [frontend/](../../frontend/). Il contient :

- `src/` : sources applicatives,
- `public/` : fichiers statiques,
- `package.json` : scripts et dépendances,
- `vite.config.ts` : configuration de build Vite,
- `tsconfig*.json` : configuration TypeScript.

Le cœur du frontend est organisé de cette façon :

```text
frontend/src/
├── components/
├── hooks/
├── i18n/
├── lib/
├── pages/
├── providers/
├── router/
├── services/
├── store/
├── styles/
├── types/
├── App.tsx
├── main.tsx
└── ...
```

Les points de navigation et de routage sont définis dans :

- [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
- [frontend/src/router/paths.ts](../../frontend/src/router/paths.ts)
- [frontend/src/router/pages.ts](../../frontend/src/router/pages.ts)

## Documentation

Le dossier [docs/](../README.md) contient les livrables de documentation technique, fonctionnelle, API et utilisateur.

## Sources

- [README.md](../../README.md)
- [backend/pom.xml](../../backend/pom.xml)
- [frontend/package.json](../../frontend/package.json)
