# Procédure de mise en production

Cette procédure ne prétend pas qu’une mise en production est déjà active. Elle décrit la séquence minimale à suivre pour préparer un déploiement Ndadiée en environnement réel, à partir des éléments vérifiés dans le dépôt.

## 1. Checklist pré-production

### Infrastructure

- choisir un hébergeur ou une plateforme de production,
- provisionner un service backend,
- provisionner un service frontend ou un reverse proxy,
- provisionner une base PostgreSQL dédiée,
- provisionner un stockage objet compatible S3,
- mettre en place un nom de domaine et HTTPS.

### Sécurité

- générer une clé `JWT_SECRET` forte,
- définir `FRONTEND_URL` avec le domaine final,
- ne pas laisser de secrets dans le dépôt,
- sécuriser le bucket Cloudflare R2 / S3,
- définir les règles d’accès réseau.

### Applicatif

- désactiver les seeders : `SEED_ENABLED=false`,
- configurer l’accès au dépôt GitHub avec token approprié,
- sécuriser les URLs API et le CORS,
- vérifier le mode de stockage médias.

## 2. Séquence de mise en ligne

1. Préparer l’inventaire des variables d’environnement.
2. Créer la base PostgreSQL de production.
3. Déployer le backend avec les variables sécurisées.
4. Vérifier l’accès à `/api/swagger-ui.html` et aux endpoints essentiels.
5. Déployer le frontend avec `VITE_BACKEND_URL` pointant vers le backend public.
6. Vérifier les routes publiques et protégées.
7. Vérifier les uploads de médias et les données de profil.
8. Tester les parcours clés : inscription, connexion, création de projet, message, forum.
9. Vérifier les logs et l’état de la base.
10. Rédiger la preuve de service public (URL, captures, tests de navigation).

## 3. Checklist de validation de la mise en service

- URL publique accessible,
- certificat HTTPS valide,
- frontend visible,
- backend accessible depuis le frontend,
- base PostgreSQL disponible,
- uploads médias fonctionnels,
- authentification fonctionnelle,
- création de projet et navigation réussies,
- logs sans erreur critique.

## 4. Preuves à remettre à l’équipe / jury

- lien public,
- captures d’écran de l’interface,
- logs de démarrage et accès,
- preuve d’authentification,
- validation des flux métier principaux,
- preuve de sauvegardes et de restauration planifiées.

## 5. Limite de preuve actuelle

Le dépôt ne contient pas actuellement de preuve d’une mise en ligne réelle. Cette procédure est donc une préparation de production, et non une confirmation de déploiement exécutif.

## Sources

- [.env.example](../../.env.example)
- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
