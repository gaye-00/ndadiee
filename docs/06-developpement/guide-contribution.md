# Guide de contribution

Le dépôt ne contient pas de politique de contribution formelle dans les fichiers observés, mais les conventions de développement et les mécanismes de build visibles dans le projet permettent d’établir une procédure de contribution robuste.

## 1. Avant de commencer

- vérifier les prérequis : [prerequis.md](./prerequis.md)
- installer le projet : [installation-locale.md](./installation-locale.md)
- configurer l’environnement : [configuration-environnement.md](./configuration-environnement.md)

## 2. Workflow recommandé

```bash
git checkout -b feature/nom-de-la-fonctionnalite
# travail local
./mvnw test
cd frontend && npm run build
```

## 3. Critères de qualité minimum

- backend compilable,
- frontend buildable,
- variables d’environnement correctement respectées,
- aucune donnée sensible ajoutée au dépôt,
- documentation des changements de configuration ou de comportement,
- validation des flux critiques sur les pages modifiées.

## 4. Bonnes pratiques de revue

- limiter le périmètre à une évolution claire,
- documenter la logique métier ajoutée,
- expliquer les dépendances et les impacts sur les flux existants,
- vérifier les chemins d’accès et les permissions lors d’un changement Spring Security ou de route React.

## 5. Avant d’ouvrir une PR

1. lancer les vérifications de base ;
2. vérifier que le backend et le frontend redémarrent dans leur contexte local ;
3. contrôler les effets sur les variables d’environnement ;
4. confirmer qu’aucune valeur secrète n’a été ajoutée au dépôt ;
5. documenter les changements si le comportement ou l’architecture critique change.

## 6. Sources

- [backend/README.md](../../backend/README.md)
- [frontend/README.md](../../frontend/README.md)
- [backend/pom.xml](../../backend/pom.xml)
- [frontend/package.json](../../frontend/package.json)
