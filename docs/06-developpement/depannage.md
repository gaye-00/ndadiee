# Dépannage

Cette page recense les problèmes de démarrage et de configuration les plus fréquents observés pour Ndadiée en environnement local.

## 1. La base PostgreSQL ne démarre pas

### Symptôme

Le backend indique une erreur de connexion PostgreSQL ou le conteneur ne répond pas.

### Vérification

```bash
docker compose up -d postgres
docker compose ps
```

### Vérification de santé

```bash
docker compose logs postgres
```

### Cause fréquente

- port `5434` déjà utilisé,
- variable `DB_PORT` en conflit,
- base non créée ou Docker non démarré.

## 2. Le backend ne démarre pas

### Vérifications

```bash
cd backend
./mvnw -q -DskipTests compile
```

### Causes fréquentes

- Java 21 absent,
- configuration `.env` invalide,
- mauvais `SPRING_DATASOURCE_URL`,
- manque de dépendances Maven.

## 3. Le frontend ne démarre pas

### Vérifications

```bash
cd frontend
npm install
npm run dev
```

### Causes fréquentes

- Node.js trop ancien,
- `node_modules` corrompus,
- backend non disponible sur `http://localhost:8080/api`.

## 4. Le frontend a des erreurs de route ou d’authentification

### Vérifications

- inspecter [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
- vérifier que `FRONTEND_URL` match le frontend local
- vérifier la disponibilité du backend

## 5. Problèmes de JWT ou de CORS

Le backend lit les variables `JWT_SECRET` et `FRONTEND_URL` depuis la configuration. Une mauvaise valeur ou un mauvais origin peut empêcher les appels front/back.

## 6. Erreurs liées à l’environnement

- vérifier le fichier [.env.example](../../.env.example),
- vérifier les variables de stockage R2 / GitHub,
- ne pas injecter des secrets dans le dépôt ou dans un historique Git partagé.

## 7. Redémarrage propre

```bash
docker compose down -v
cd backend && ./mvnw spring-boot:run
cd ../frontend && npm run dev
```

## Sources

- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [docker-compose.yml](../../docker-compose.yml)
- [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
- [frontend/package.json](../../frontend/package.json)
