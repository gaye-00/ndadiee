# Stockage de fichiers

Le projet prévoit un stockage de fichiers de type objet, avec compatibilité Cloudflare R2 / AWS S3, et un fallback local en environnement de développement.

## 1. Configuration observée

La configuration est dans [.env.example](../../.env.example) et [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

Variables :

- `STORAGE_PROVIDER`
- `STORAGE_LOCAL_DIRECTORY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `R2_ENDPOINT`

Le fichier de configuration précise :

- `provider: ${STORAGE_PROVIDER:auto}`
- `local-directory: ${STORAGE_LOCAL_DIRECTORY:uploads}`
- `max-image-size: ${STORAGE_MAX_IMAGE_SIZE:5MB}`
- `max-uploads-per-hour: ${STORAGE_MAX_UPLOADS_PER_HOUR:40}`

## 2. Comportement réel

Le dépôt indique que :

- si les variables R2 sont complètes, le système utilise R2 ;
- sinon il passe sur le stockage local du backend,
- `STORAGE_PROVIDER=r2` impose le mode R2, et l’application refuse de démarrer sans les paramètres requis.

## 3. Bonnes pratiques de production

- sécuriser les accès R2 avec un jeton limité au bucket,
- gérer la gestion de lifecycle pour les fichiers orphelins,
- vérifier le cache et le domaine public des objets,
- contrôler les quotas d’upload par utilisateur,
- conserver un contrôle du type MIME réel, pas seulement de l’extension.

## 4. Risques

- un mauvais paramétrage R2 peut écraser ou bloquer les images et médias,
- un stockage local n’est pas adapté à un déploiement multi-instance,
- les objets orphelins peuvent consommer de l’espace si l’architecture de nettoyage n’est pas prévue.

## 5. Preuves à collecter

- le bucket R2 ou l’équivalent est bien accessible depuis le backend,
- l’URL publique des médias est fonctionnelle,
- les images de projet et de profil chargent correctement,
- les fichiers orphelins ne cassent pas l’application.

## Sources

- [.env.example](../../.env.example)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
