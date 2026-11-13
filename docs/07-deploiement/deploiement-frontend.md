# Déploiement du frontend

Le frontend Ndadiée est un projet React + TypeScript construit avec Vite. Les scripts du dépôt montrent une logique de build côté frontend, mais aucun manifeste de déploiement public n’est fourni.

## 1. Paramétrage actuel

Le frontend construit son URL API à partir de la variable d’environnement :

- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)

```ts
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080/api';
```

## 2. Commandes de build

```bash
cd frontend
npm install
npm run build
```

Le script de build définit :

- `tsc -b`
- `vite build`

## 3. Production recommandée

### Option 1 : frontend servi statiquement

- build Vite produit un dossier `dist`,
- publication via un serveur web statique ou un CDN,
- configuration de `VITE_BACKEND_URL` vers le backend public,
- sécurisation du domaine de l’API et tableau CORS côté backend.

### Option 2 : frontend servi par un runtime Node ou Nginx

- servir `dist/` via Nginx,
- mettre en place un proxy de `/api` vers le backend,
- ajouter le certificat HTTPS.

## 4. Points de vigilance

- les liens de production doivent utiliser un domaine réel et fiable,
- le frontend ne doit pas pointer vers une API non sécurisée en production,
- `FRONTEND_URL` côté backend doit correspondre exactement à l’origine du front,
- le certificat TLS doit être géré correctement et renouvelé.

## 5. Preuves à collecter

- URL publique du frontend accessible,
- page d’accueil chargée sans erreur JavaScript,
- appels API réussis après authentification,
- pages critiques affichées (connexion, profil, projet, forum, messages),
- tests sur un navigateur réel avec l’URL publique.

## Sources

- [frontend/package.json](../../frontend/package.json)
- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
