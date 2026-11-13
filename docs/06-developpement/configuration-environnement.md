# Configuration de l’environnement

Le projet lit la majorité des valeurs de configuration depuis des variables d’environnement et leurs valeurs par défaut dans [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml). La feuille de référence est [.env.example](../../.env.example).

## 1. Modèle de configuration

### Base PostgreSQL

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `DB_NAME` | `ndadiee` | nom de la base locale |
| `DB_USER` | `ndadiee` | utilisateur PostgreSQL |
| `DB_PASSWORD` | valeur de développement non reproduite | mot de passe local ; choisir une valeur propre à l’environnement |
| `DB_PORT` | `5434` | port exposé sur l’hôte |

Les valeurs sont consommées par [docker-compose.yml](../../docker-compose.yml).

### Backend Spring

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5434/ndadiee` | URL JDBC |
| `SPRING_DATASOURCE_USERNAME` | `ndadiee` | utilisateur DB |
| `SPRING_DATASOURCE_PASSWORD` | valeur de développement non reproduite | mot de passe DB ; ne pas réutiliser en production |
| `SERVER_PORT` | `8080` | port du backend |
| `JWT_SECRET` | aucune ; obligatoire, Base64 et au moins 256 bits | clé de signature JWT, validée au démarrage |
| `JWT_ACCESS_TOKEN_EXPIRATION` | `30m` | durée du token d’accès |
| `JWT_REFRESH_TOKEN_EXPIRATION` | `30d` | durée du refresh token |
| `FRONTEND_URL` | `http://localhost:5173` | origine autorisée CORS |

### Données de démonstration et initialisation

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `SEED_ENABLED` | `false` | activation explicite des données de démonstration |
| `SEED_ADMIN_PASSWORD` | valeur de développement non reproduite | mot de passe du compte admin local |
| `SEED_DEMO_PASSWORD` | valeur de développement non reproduite | mot de passe des comptes de démonstration |
| `SEED_TEST_ACCOUNT_PASSWORD` | valeur de développement non reproduite | mot de passe des comptes de test |

### Stockage de fichiers

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `STORAGE_PROVIDER` | `auto` | fournisseur de stockage |
| `STORAGE_LOCAL_DIRECTORY` | `uploads` | dossier local de fallback |
| `R2_ACCOUNT_ID` | vide | compte Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | vide | clé d’accès R2 |
| `R2_SECRET_ACCESS_KEY` | vide | secret R2 |
| `R2_BUCKET` | vide | bucket cible |
| `R2_PUBLIC_URL` | vide | URL publique des objets |

### GitHub et mail

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `GITHUB_TOKEN` | vide | authentification GitHub |
| `GITHUB_API_URL` | `https://api.github.com` | endpoint API GitHub |
| `GITHUB_SYNC_ENABLED` | `true` | synchronisation des PR actives |
| `MAIL_FROM` | `Ndadiee <no-reply@hautetech.org>` | expéditeur email |

## 2. Bonnes pratiques

- Ne pas versionner un `.env` réel contenant des secrets.
- Séparer strictement environnement local et environnement de production.
- Tester les valeurs de JWT et de stockage avant toute mise en ligne.
- Ne pas copier des secrets d’un autre environnement dans le dépôt.

## 3. Exemple de configuration locale

```env
DB_NAME=ndadiee
DB_USER=ndadiee
DB_PASSWORD=remplacer-par-une-valeur-locale
DB_PORT=5434

JWT_SECRET=remplacer-par-une-clé-locale-générée-avec-openssl
FRONTEND_URL=http://localhost:5173
SEED_ENABLED=false
STORAGE_PROVIDER=auto
```

Générer la clé JWT locale avec `openssl rand -base64 48` et la fournir comme variable d’environnement. Sans clé valide, le backend refuse de démarrer. Les seeders ne s’exécutent que si `SEED_ENABLED=true` **et** si les trois mots de passe de seed sont configurés. Ne jamais activer les seeders sur une base partagée ou de production.

## 4. Sources

- [.env.example](../../.env.example)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [docker-compose.yml](../../docker-compose.yml)
