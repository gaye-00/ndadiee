# Installation locale

Cette procédure correspond à la mise en route standard du projet en environnement de développement. Elle est cohérente avec les scripts et les fichiers de configuration du dépôt.

## 1. Récupérer le projet

```bash
git clone <url-du-repo>
cd ndadiee
```

## 2. Préparer le fichier d’environnement

Le projet fournit [.env.example](../../.env.example). Pour un environnement local, il est conseillé de créer un fichier `.env` local en réutilisant les variables de référence, sans copier de secrets réels d’un environnement partagé.

```bash
cp .env.example .env
```

Important :

- ne pas versionner le fichier `.env` final,
- utiliser des valeurs locales sûres,
- garder les valeurs de production hors du dépôt.

## 3. Démarrer PostgreSQL

Selon [docker-compose.yml](../../docker-compose.yml), le service `postgres` est le service local de base de données.

```bash
docker compose up -d postgres
```

Le conteneur expose le port interne `5432` sur l’hôte `127.0.0.1:5434`.

## 4. Installer les dépendances frontend

```bash
cd frontend
npm install
```

La commande est cohérente avec [frontend/package.json](../../frontend/package.json), qui définit le script `dev` et les dépendances de développement.

## 5. Démarrer le backend

```bash
cd ../backend
./mvnw spring-boot:run
```

Le backend est configuré pour écouter sur `http://localhost:8080` avec le contexte `/api`, selon [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

## 6. Démarrer le frontend

```bash
cd ../frontend
npm run dev
```

Le frontend est attendu sur `http://localhost:5173`.

## Vérification fonctionnelle

Une fois les deux services lancés :

- backend : `http://localhost:8080/api`
- frontend : `http://localhost:5173`
- Swagger UI : `http://localhost:8080/api/swagger-ui.html`

## Procédure de reprise rapide

```bash
cd /path/to/ndadiee
docker compose up -d postgres
cd backend && ./mvnw spring-boot:run
cd ../frontend && npm run dev
```

## Sources

- [backend/README.md](../../backend/README.md)
- [frontend/README.md](../../frontend/README.md)
- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
