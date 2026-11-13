# Sécurité des données

## Données et stockage observés

- PostgreSQL pour les données applicatives, via Spring Data JPA.
- Fichiers image via un backend de stockage local ou Cloudflare R2/S3, sélectionné par [StorageConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/storage/StorageConfiguration.java).
- Access token, refresh token, profil et préférences côté navigateur dans `localStorage` : [storage.ts](../../frontend/src/utils/storage.ts).
- Les erreurs client et serveur sont formatées par [GlobalExceptionHandler.java](../../backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java).

## Contrôles visibles

- Plusieurs contrôleurs valident les DTO avec `@Valid`.
- Les fichiers image sont limités, identifiés par leurs octets plutôt que par leur extension ou MIME annoncé, et nommés avec UUID : [ImageUploadService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/media/ImageUploadService.java).
- Le Markdown de membre ne rend pas l'HTML brut et filtre les protocoles de liens : [MarkdownContent.tsx](../../frontend/src/components/shared/MarkdownContent.tsx).
- Les erreurs génériques renvoient un message générique au client, tandis que le détail est journalisé.

## Risques et limites

| Fichier | Constat | Risque | Priorité |
|---|---|---|---|
| [storage.ts](../../frontend/src/utils/storage.ts) | Les jetons sont accessibles au JavaScript de l'origine via `localStorage` | Impact important en cas d'injection de script ; aucune injection exploitable n'a été confirmée | Élevée |
| [application.yaml](../../backend/src/main/resources/application.yaml), [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql) | Flyway applique V1 et Hibernate valide (`validate`) dans tous les profils. Une base historique exige une baseline explicite, après comparaison à V1. | Une baseline sans vérification pourrait masquer une divergence de schéma ; production non vérifiée. | Élevée |
| [ImageUploadService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/media/ImageUploadService.java) | Compteur de quota en mémoire par instance | Quota non partagé en déploiement multi-instance | Moyenne |
| [application.yaml](../../backend/src/main/resources/application.yaml) | Fallback stockage local possible | Données médias dépendantes du disque et non partagées entre instances | Moyenne |

## Recommandations

- Définir les règles de conservation, suppression et export des données personnelles.
- Limiter l'accès aux sauvegardes et au bucket, chiffrer les sauvegardes et tester la restauration.
- Vérifier que les logs n'incluent ni token, ni mot de passe, ni contenu privé superflu.
- Envisager des cookies `HttpOnly`, `Secure`, `SameSite` ou une solution BFF pour les jetons.
- Ajouter CSP et tests anti-XSS, tout en conservant le rendu Markdown contrôlé.
- Pour une base existante, vérifier la sauvegarde et la compatibilité avec la migration avant d'exécuter la baseline.
