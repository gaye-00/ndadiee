# Prérequis

Cette section recense les outils nécessaires pour démarrer Ndadiée en environnement local et pour contribuer au projet sans ambiguïté.

## Versions minimales et recommandées

### Backend Java / Maven

- Java : 21
- Maven : fourni via le wrapper `backend/mvnw`, configuré pour Maven 3.10.0 dans `backend/.mvn/wrapper/maven-wrapper.properties`.

Vérification :

```bash
java -version
./mvnw -v
```

Le dépôt configure explicitement `java.version` à `21` dans [backend/pom.xml](../../backend/pom.xml).

### Frontend Node.js / npm

- Node.js : `^20.19.0` ou `>=22.12.0` selon les contraintes du Vite 8 résolu dans l’installation vérifiée.
- npm : livré avec Node.js

Vérification :

```bash
node -v
npm -v
```

Le dépôt passe par Vite 8 et React 19 dans [frontend/package.json](../../frontend/package.json).

### Base PostgreSQL

Le projet est prévu pour fonctionner avec PostgreSQL. La configuration Docker est fournie dans [docker-compose.yml](../../docker-compose.yml) et expose un conteneur sur le port `5434` local.

Vérification :

```bash
docker --version
docker compose config --services
```

### Outils de développement

- Git
- un terminal Bash ou équivalent
- éventuellement un éditeur avec support Java + TypeScript (VS Code, IntelliJ, etc.)

Vérification :

```bash
git --version
```

## Vérification rapide avant de commencer

```bash
cd /path/to/ndadiee
java -version
node -v
npm -v
docker --version
```

## Points de vigilance

- Le backend attend PostgreSQL sur `localhost:5434` par défaut, comme indiqué dans [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).
- Les identifiants et mots de passe de développement sont définis dans [.env.example](../../.env.example) et ne doivent pas être copiés tels quels dans un environnement partagé.
- Les secrets de production doivent être fournis via variables d’environnement, pas stockés dans le dépôt.

## Documents liés

- [installation-locale.md](./installation-locale.md)
- [configuration-environnement.md](./configuration-environnement.md)
- [base-de-donnees.md](./base-de-donnees.md)
