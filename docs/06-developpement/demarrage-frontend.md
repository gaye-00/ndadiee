# Démarrage du frontend

Le frontend Ndadiée est une application React + TypeScript construite avec Vite. Sa configuration est visible dans [frontend/package.json](../../frontend/package.json).

## Commandes standard

### Installer les dépendances

```bash
cd frontend
npm install
```

### Lancer le frontend en mode développement

```bash
cd frontend
npm run dev
```

Le projet attend le backend sur `http://localhost:8080/api` et expose l’interface sur `http://localhost:5173`.

### Vérifier le build

```bash
cd frontend
npm run build
```

### Vérifier la qualité du code

```bash
cd frontend
npm run lint
```

### Vérifier la cohérence des fichiers de langue

```bash
cd frontend
npm run i18n:check
```

## Structure technique importante

- routage : [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
- chemins de routes : [frontend/src/router/paths.ts](../../frontend/src/router/paths.ts)
- pages chargées à la demande : [frontend/src/router/pages.ts](../../frontend/src/router/pages.ts)
- auth : [frontend/src/hooks/useAuth.ts](../../frontend/src/hooks/useAuth.ts)
- services API : [frontend/src/services](../../frontend/src/services)

## Bonnes pratiques

- Garder le backend démarré avant d’utiliser les écrans qui appellent l’API.
- Faire attention au `FRONTEND_URL` côté backend si vous changez l’origine locale.
- Vérifier les traductions et les clés i18n lors d’une modification d’une page ou d’un composant.

## Sources

- [frontend/README.md](../../frontend/README.md)
- [frontend/package.json](../../frontend/package.json)
- [frontend/src/router/index.tsx](../../frontend/src/router/index.tsx)
