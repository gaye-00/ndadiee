# Tests frontend

## État observé

Les scripts de [frontend/package.json](../../frontend/package.json) comprennent :

- `npm run build` : `tsc -b && vite build`,
- `npm run lint` : Oxlint,
- `npm run i18n:check` : script local de cohérence des traductions,
- `npm run dev` et `npm run preview`.

Aucun script `test` et aucun fichier de test `*.test.*` ou `*.spec.*` n'ont été repérés sous `frontend/src` pendant l'inventaire.

## Vérifications exécutées

- `npm run lint` : réussi.
- `npm run i18n:check` : réussi ; les 10 langues et 12 espaces de noms ont les mêmes clés.
- `npm run build` : réussi le 6 novembre 2026 ; cela valide le typage et la compilation, pas les parcours métier.
- Serveur Vite local et route d’accueil : HTTP 200 et rendu observés ; aucun parcours API n’a été validé.

## Limites

Le lint, le contrôle des traductions et le build ne valident pas les interactions réelles dans le navigateur, les appels réseau, l'accessibilité ou les parcours de connexion. Aucun test de navigateur distant ou intrusif n'a été réalisé.

## Recommandations

Ajouter progressivement une suite front avec :

1. tests unitaires de fonctions métier et de formatage ;
2. tests de composants/forms pour erreurs, validations et états de chargement ;
3. tests de routes protégées et des transitions d'authentification ;
4. tests de parcours navigateur pour inscription, création de projet, forum, messagerie et notifications ;
5. mocks de l'API qui restent cohérents avec les DTO backend.
