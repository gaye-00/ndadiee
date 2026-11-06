# Workflow Git

Le dépôt ne contient pas de politique Git formelle dans les fichiers examinés. Le workflow ci-dessous est une base raisonnable pour un projet de cette taille et reste compatible avec les outils déjà présents dans le dépôt.

## Flux conseillé

### 1. Créer une branche dédiée

```bash
git checkout -b feature/nom-clarif
```

### 2. Développer par petite unité

- une branche = un sujet,
- un sujet = un changement cohérent,
- éviter les mélanges entre correctifs, refactorings et docs sans lien.

### 3. Vérifier avant validation

```bash
cd backend && ./mvnw test
cd frontend && npm run build && npm run lint
```

### 4. Produire un commit lisible

```bash
git add .
git commit -m "feat: description du changement"
```

### 5. Ouvrir une PR

- description claire du problème,
- contexte métier,
- fichiers touchés,
- validations effectuées,
- risques ou limites identifiés.

## Bonnes pratiques

- ne pas pousser de secrets ou de fichiers `.env`,
- ne pas modifier le code source sans vérification locale,
- garder les branches courtes et bien nommées,
- faire des commits atomiques,
- relire les changements avant l’ouverture de la PR.

## Sources

- [README.md](../../README.md)
- [backend/README.md](../../backend/README.md)
- [frontend/README.md](../../frontend/README.md)
