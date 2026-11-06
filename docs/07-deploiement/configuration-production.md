# Configuration de production

Le projet ne contient pas de fichier de configuration de production complet dans le dépôt. Les valeurs nécessaires sont définies dans [.env.example](../../.env.example) et [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml), mais elles doivent être adaptées à chaque environnement réel.

## 1. Variables critiques à sécuriser

### Backend

- `JWT_SECRET`
- `FRONTEND_URL`
- `SEED_ENABLED`
- `SEED_ADMIN_PASSWORD`
- `SEED_DEMO_PASSWORD`
- `SEED_TEST_ACCOUNT_PASSWORD`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GITHUB_TOKEN`

### Frontend

- `VITE_BACKEND_URL`
- variables de build si la CI publie le front statiquement

## 2. Paramètres observés

Le backend lit les valeurs suivantes :

- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- `SERVER_PORT=8080`
- `FRONTEND_URL=http://localhost:5173`
- `JWT_SECRET` (obligatoire, Base64 valide, au moins 256 bits ; aucun fallback)
- `STORAGE_PROVIDER=auto`
- `GITHUB_SYNC_ENABLED=true`

Tri de production recommandé :

- `SEED_ENABLED=false`
- `STORAGE_PROVIDER=r2` si le stockage objet est disponible
- `GITHUB_SYNC_ENABLED=true` uniquement avec token valide et quota assumé
- le profil `prod` active l'envoi SMTP via `ndadiee.mail.enabled` ; les identifiants doivent être injectés hors dépôt et leur connexion validée en staging. `MAIL_ENABLED` n'est pas une variable d'environnement déclarée par la configuration observée.

Le profil `prod` définit `ddl-auto=validate`, désactive explicitement les seeders, et Flyway applique les migrations versionnées depuis `backend/src/main/resources/db/migration`. La clé JWT est requise dans la configuration commune et validée au démarrage ; aucune valeur de repli n'est fournie. Ces garde-fous sont vérifiés dans le dépôt, mais le profil actif et les variables injectées sur une infrastructure réelle ne sont pas démontrés. Pour une base historique sans table Flyway, une baseline manuelle en version 1 n'est permise qu'après sauvegarde vérifiée et comparaison du schéma à V1 ; Flyway ne baseline pas automatiquement. Voir la procédure dans [Déploiement PostgreSQL](./deploiement-postgresql.md) et l’[audit opérationnel](../08-qualite-securite/audit-operationnel.md).

## 3. Règles de sécurité

- ne pas stocker de secrets dans le dépôt,
- ne pas utiliser les valeurs par défaut de dev en production,
- restreindre les accès DB et storage à l’applicatif uniquement,
- faire correspondre le CORS au domaine public réel,
- fermer les ports inutiles sur le serveur.

## 4. Configuration applicative recommandée

```yaml
server:
  port: 8080
frontend:
  url: https://app.example.com
jwt:
  secret: ${JWT_SECRET:}
ndadiee:
  seed:
    enabled: false
  storage:
    provider: r2
```

`JWT_SECRET` ne doit pas être vide : le backend refuse de démarrer si la clé est absente, invalide ou trop courte. Les variables de seed ne sont nécessaires que si les seeders sont activés explicitement dans un environnement local dédié.

## 5. Éléments manquants

Aucun manifeste de déploiement prod n’est visible dans le dépôt ; une configuration cible doit donc être ajoutée côté CI/CD ou sidecar infrastructure, puis validée par les équipes et par les tests d’accès.

## Sources

- [.env.example](../../.env.example)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)
