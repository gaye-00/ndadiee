# Conventions de code

Le dépôt ne formalise pas un guide de style complet dans un fichier unique de l’arborescence observée, mais plusieurs conventions sont visibles dans le code et dans les fichiers de configuration.

## 1. Langages et principes à respecter

### Backend Java

- Utiliser Java 21.
- S’appuyer sur les conventions Spring Boot et Spring Data JPA.
- Favoriser des fichiers de configuration centrés sur `application.yaml`.
- Maintenir une séparation claire entre `controller`, `service`, `entity`, `repository`, `security` et `dto`.

Les dépendances de compilation incluent Lombok et MapStruct dans [backend/pom.xml](../../backend/pom.xml).

### Frontend TypeScript

- Utiliser TypeScript et Vite.
- Respecter la structure des modules `pages`, `components`, `hooks`, `services`, `store`.
- Aligner les types API côté frontend avec les DTO backend.
- Utiliser les bibliothèques déjà présentes pour les formulaires, le routage et la gestion de cache.

La structure est visible dans [frontend/package.json](../../frontend/package.json) et [frontend/src](../../frontend/src).

## 2. Règles de qualité affichées dans le dépôt

- build type-check : `npm run build` pour le frontend,
- compilation Maven : `./mvnw -DskipTests compile` pour le backend,
- lint du frontend : `npm run lint`,
- vérification d’i18n : `npm run i18n:check`.

## 3. Bonnes pratiques recommandées de contribution

- Garder les changements disciplinés et limités au périmètre fonctionnel concerné.
- Documenter les changements de configuration et les variables d’environnement.
- Vérifier la cohérence entre les changements front et back.
- Ajouter ou ajuster les tests si le dépôt le permet dans votre contexte.

## 4. Règles de sécurité de contribution

- Ne jamais exposer les secrets dans les fichiers versionnés.
- Valider les paramètres côté backend et côté frontend lorsque la logique l’exige.
- Vérifier les risques liés au stockage de fichiers, aux tokens JWT et aux RLS / permissions.

## 5. Sources

- [backend/pom.xml](../../backend/pom.xml)
- [frontend/package.json](../../frontend/package.json)
- [frontend/src](../../frontend/src)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
