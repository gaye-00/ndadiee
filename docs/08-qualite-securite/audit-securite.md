# Audit de sécurité

## Périmètre et limites

L'audit repose sur l'examen du dépôt et sur une revue de sécurité ciblée déléguée. Aucun test intrusif n'a été mené sur une cible distante. Les environnements de production, leurs secrets, leur configuration réseau et leurs journaux ne sont pas accessibles via le dépôt.

La revue de sécurité déléguée antérieure n'a remonté aucune vulnérabilité confirmée dans son périmètre. Le durcissement local effectué le 6 novembre 2026 a supprimé le fallback JWT, désactivé les seeders par défaut et ajouté Flyway V1 avec validation Hibernate (`validate`). La migration et la baseline d'un schéma historique ont été testées sur des bases PostgreSQL temporaires ; l'état des secrets, des comptes et du schéma dans un environnement distant reste non vérifiable. Les avis de sécurité actuels des dépendances n'ont pas été vérifiés contre une base externe.

## Contrôles observés dans le code

- JWT signés, vérification de signature et expiration, séparation des types access/refresh : [JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java).
- Filtre HTTP JWT : [JwtAuthenticationFilter.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtAuthenticationFilter.java).
- Autorisations stateless par règles d'URL et permissions : [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java).
- Contrôle supplémentaire du rôle Admin dans les routes d'administration et test dédié : [AdminController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/AdminController.java), [AdminSecurityTest.java](../../backend/src/test/java/com/hautetech/ndadiee/controller/AdminSecurityTest.java).
- Authentification STOMP au `CONNECT`, et restrictions des destinations d'abonnement/envoi : [StompAuthenticationInterceptor.java](../../backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java).
- Rendu Markdown avec `skipHtml`, filtrage des protocoles de liens et attributs de lien externe : [MarkdownContent.tsx](../../frontend/src/components/shared/MarkdownContent.tsx).
- Téléversements image avec détection du format sur les octets du fichier, taille plafonnée et quotas en mémoire : [ImageUploadService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/media/ImageUploadService.java).
- Erreurs API centralisées : [GlobalExceptionHandler.java](../../backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java).

## Constats de risque (non assimilés à des vulnérabilités confirmées)

| Fichier | Problème observé | Risque | Priorité | Recommandation |
|---|---|---|---|---|
| [application.yaml](../../backend/src/main/resources/application.yaml), [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql) | Clé JWT obligatoire, seeders off par défaut, migrations Flyway activées et validation Hibernate dans tous les profils. | Configuration distante non vérifiée ; une base historique incorrecte baselinée peut échouer à la validation ou diverger. | Élevée avant mise en production | Comparer une sauvegarde au schéma V1, baseliner seulement si elle correspond et valider le démarrage cible |
| [storage.ts](../../frontend/src/utils/storage.ts) | Jetons d'accès et de renouvellement stockés dans `localStorage` | Un script injecté dans l'origine pourrait lire les jetons ; aucun exploit XSS n'a été établi | Élevée | Évaluer cookies HttpOnly/SameSite ou une architecture BFF ; renforcer CSP et contrôles XSS |
| [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java) | CORS autorise `frontend.url` plus `http://localhost:*`, avec credentials | La portée localhost doit rester limitée au développement ; configuration prod à contrôler | Moyenne | Vérifier le domaine exact du profil prod et éviter toute origine de développement en production |
| [ImageUploadService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/media/ImageUploadService.java) | Quota d'upload conservé en mémoire par instance | Le quota peut être contourné par répartition multi-instance ou réinitialisé au redémarrage | Moyenne | Utiliser un compteur partagé/stockage distribué pour une production multi-instance |
| [pom.xml](../../backend/pom.xml), [package.json](../../frontend/package.json) | Dépendances répertoriées, mais aucun rapport d'avis courant fourni | Vulnérabilités de dépendances non évaluées à date | Moyenne | Ajouter un audit automatisé de dépendances dans la CI et traiter les alertes vérifiées |
| [WebSocketConfig.java](../../backend/src/main/java/com/hautetech/ndadiee/config/WebSocketConfig.java) | Broker STOMP simple en mémoire | Pas de diffusion inter-instance avec plusieurs serveurs ; risque de fonctionnement/ disponibilité, non de fuite confirmé | Faible à moyenne | Utiliser un broker relay ou garantir une instance unique |

## Vérifications exécutées

- `AdminSecurityTest`, `AuthenticationServiceTest`, `StorageConfigurationTest` : réussis.
- `npm run lint` et `npm run i18n:check` : réussis.
- Suite backend complète exécutée le 6 novembre 2026 après durcissement, sur PostgreSQL 17 temporaire sans volume : 313 tests, 0 échec, 0 erreur, 0 ignoré, y compris un test du profil `prod` confirmant l'absence des comptes de démonstration testés. Une exécution antérieure sans base accessible avait échoué au chargement du contexte. Analyse automatisée de vulnérabilités, test WebSocket réel, test de pénétration et audit d'un environnement de production : non exécutés.

## Conclusion

Aucune vulnérabilité exploitable confirmée n'est rapportée par la revue déléguée. Les risques de configuration et d'architecture ci-dessus doivent néanmoins être traités avant d'affirmer que l'application est sécurisée en production.
