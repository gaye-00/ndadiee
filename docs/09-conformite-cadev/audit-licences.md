# Audit des licences

## Conclusion actuelle

**Statut : non vérifiable.** Les fichiers de dépendances du projet existent, mais aucun rapport d’analyse complet des licences directes et transitives n’est fourni dans le dépôt. Les licences applicables aux composants ne sont donc pas déclarées conformes ou non conformes dans ce document.

## Sources de dépendances

- [backend/pom.xml](../../backend/pom.xml) : dépendances Maven directes et gestion de versions ;
- [backend/.mvn/wrapper](../../backend/.mvn/wrapper) : Maven Wrapper ;
- [frontend/package.json](../../frontend/package.json) : dépendances directes npm ;
- [frontend/package-lock.json](../../frontend/package-lock.json) : versions résolues du graphe npm ;
- [backend/package-lock.json](../../backend/package-lock.json) : fichier de verrouillage présent dans le dépôt, dont son rôle backend doit être confirmé.

La présence d’un lockfile n’est pas un rapport de licence, et un examen des seules dépendances directes ne suffit pas à couvrir les dépendances transitives.

## Vérifications à réaliser

1. Générer les graphes de dépendances résolus pour Maven et npm.
2. Collecter les déclarations de licence des dépendances directes et transitives.
3. Examiner les licences manquantes, multiples, conditionnelles ou non standard.
4. Comparer les résultats aux restrictions officielles communiquées par l’organisateur.
5. Examiner également les polices, icônes, images, exemples, contenus de démonstration et autres ressources distribuées.
6. Faire valider les exceptions par la personne responsable des licences.
7. Archiver les rapports avec versions, date et commit audités.

## Tableau à remplir

| Composant | Version résolue | Direct/transitif | Licence déclarée | Source de preuve | Évaluation |
|---|---|---|---|---|---|
| À remplir après génération d’un inventaire complet | À vérifier | À vérifier | À vérifier | Rapport à produire | Non vérifiable |

## Limite juridique

Ce document est un état de vérification technique, pas un avis juridique. Aucune conclusion de conformité juridique ne peut être tirée sans inventaire complet, règles CADEV authentifiées et examen des obligations applicables.
