# Nom de domaine et HTTPS

Le dépôt ne contient aucun élément de configuration TLS, de certificat ou de nom de domaine public. La configuration de domaine doit donc être adaptée au contexte réel d’hébergement, sans supposer un domaine existant.

## 1. Paramètres observés

Le backend déclare :

- `FRONTEND_URL=http://localhost:5173` dans [.env.example](../../.env.example)

Le frontend construit son adresse API à partir de :

- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)

```ts
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080/api';
```

## 2. Configuration de production attendue

Pour une production sécurisée :

- utiliser un domaine public (ex. `app.example.com`),
- rediriger le trafic HTTP vers HTTPS,
- utiliser un certificat TLS valide,
- configurer le front et l’API derrière le même nom de domaine ou via sous-domaines séparés,
- sécuriser les cookies et les tokens s’ils sont utilisés côté navigateur.

## 3. Bonnes pratiques

- ne pas laisser l’API ou le frontend sur `http` en production,
- ne pas exposer le port 8080 directement si un reverse proxy tient déjà la TLS,
- utiliser des règles de redirection propres,
- mettre en place le renouvellement automatique du certificat.

## 4. Architecture recommandée

```mermaid
flowchart LR
    U[Utilisateur] --> D[https://app.example.com]
    D --> RP[Reverse Proxy / TLS]
    RP --> FE[Frontend]
    RP --> BE[Backend /api]
```

## 5. Preuves à collecter

- URL publique valide,
- certificat HTTPS actif,
- redirection HTTP → HTTPS,
- absence d’avertissement de sécurité navigateur,
- test sur navigateur réel avec la vraie URL.

## Sources

- [.env.example](../../.env.example)
- [frontend/src/utils/constants.ts](../../frontend/src/utils/constants.ts)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
