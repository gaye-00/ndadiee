# Stratégie de tests

## Inventaire vérifié

- 46 fichiers Java sous `backend/src/test/java`.
- Aucun fichier frontend `*.test.ts`, `*.test.tsx`, `*.spec.ts` ou `*.spec.tsx` repéré sous `frontend/src`.
- Le frontend déclare `build`, `lint` et `i18n:check` dans [frontend/package.json](../../frontend/package.json), mais pas de script `test`.
- `NdadieeApplicationTests` démarre le contexte Spring et indique que PostgreSQL local est requis : [NdadieeApplicationTests.java](../../backend/src/test/java/com/hautetech/ndadiee/NdadieeApplicationTests.java).

## Couverture constatée dans les sources

Les tests backend couvrent notamment l'authentification, des services métier, la modération, les téléversements, le stockage, les notifications, les revues de code, GitHub et le workspace. Exemples :

- [AuthenticationServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/authentication/AuthenticationServiceTest.java)
- [AdminSecurityTest.java](../../backend/src/test/java/com/hautetech/ndadiee/controller/AdminSecurityTest.java)
- [ImageUploadServiceTest.java](../../backend/src/test/java/com/hautetech/ndadiee/service/media/ImageUploadServiceTest.java)
- [StorageConfigurationTest.java](../../backend/src/test/java/com/hautetech/ndadiee/storage/StorageConfigurationTest.java)
- [GithubClientTest.java](../../backend/src/test/java/com/hautetech/ndadiee/github/GithubClientTest.java)

La présence de tests ne permet pas de déduire une couverture de code mesurée ; aucun rapport de couverture n'a été produit.

## Vérifications exécutées pour cet audit

| Vérification | Résultat |
|---|---|
| `cd backend && SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5434/ndadiee SPRING_DATASOURCE_USERNAME=ndadiee SPRING_DATASOURCE_PASSWORD="$POSTGRES_TEST_PASSWORD" ./mvnw test` (6 novembre 2026) | 313 tests, 0 échec, 0 erreur, 0 ignoré, sur PostgreSQL 17 temporaire sans volume ; migration V1 appliquée automatiquement |
| `cd frontend && npm run build` (6 novembre 2026) | Réussie |
| `cd frontend && npm run lint` (6 novembre 2026) | Réussie |
| `cd frontend && npm run i18n:check` (6 novembre 2026) | Réussie : 10 langues et 12 espaces de noms |
| Tests frontend automatisés | Aucun script `test` déclaré |
| Démarrage Vite et page d’accueil | HTTP 200 et rendu local observés ; cela ne valide pas les API |
| Test réel WebSocket et parcours métier navigateur | Non exécutés |

Le test de contexte global demande PostgreSQL. Il a été exécuté avec une base temporaire exposée en local, sans volume partagé. Le volume PostgreSQL préexistant du dépôt n’a pas été touché. Voir le [rapport d’audit opérationnel](./audit-operationnel.md) pour le périmètre exact.

## Commandes disponibles dans le dépôt

```bash
cd backend && ./mvnw test
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run i18n:check
```

Le script `build` lance `tsc -b` puis `vite build`. Cela valide les types et la compilation de production, mais ne remplace pas des tests de composants ou de parcours.

## Recommandations

1. Ajouter des tests frontend pour l'authentification, les routes protégées, les formulaires et les erreurs API.
2. Ajouter des tests d'intégration pour les règles d'accès sensibles et le protocole STOMP.
3. Continuer d'exécuter la suite complète avec une base PostgreSQL isolée et éphémère en CI.
4. Publier une mesure de couverture et la suivre sans la confondre avec la qualité globale.
5. Ajouter des tests de parcours utilisateur critiques dans un navigateur automatisé.
