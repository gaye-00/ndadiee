# Dossier de conformité CADEV 2026

Ce dossier confronte Ndadiée au cadre CADEV fourni pour la phase de documentation : thème, période, taille d’équipe et livrables. Il distingue les faits visibles dans le dépôt des éléments qui nécessitent une preuve extérieure.

## Cadre utilisé

Le thème, le calendrier, les équipes de 2 à 5 personnes et les livrables présentés dans ce dossier proviennent du cadre transmis par l’équipe. Le 11 novembre 2026, l’équipe a confirmé que ce cadre correspond aux conditions reçues pour le concours. Le document complet émis par l’organisateur n’est pas annexé ici.

## Évaluation synthétique

- **Adéquation au thème : partiellement conforme.** Le code contient des fonctions de projets, forum, collaboration, profils et communauté pertinentes pour les développeurs. Leur disponibilité sur une plateforme en ligne n’est pas démontrée.
- **Dépôt Git : partiellement conforme.** Le dépôt local et un remote GitHub configuré sont observables ; son accessibilité au jury et son état de publication ne sont pas confirmés ici.
- **Déploiement : confirmé par l’équipe, vidéo attendue.** L’équipe confirme l’accès extérieur à [https://ndadiee.com/](https://ndadiee.com/) avec HTTPS, ainsi que le fonctionnement de la version en ligne, de l’API, de la base et des parcours principaux. Le lien vidéo annoncé reste à fournir ; ces éléments n’ont pas été revérifiés indépendamment dans cette revue.
- **Équipe : deux membres inscrits, selon leur confirmation.** Abdoulaye GAYE et Aliou DIOP confirment leur inscription officielle. Ils déclarent tous deux avoir participé aux tests ; Aliou a contribué à l’audit fonctionnel et Abdoulaye au développement backend et à l’ajout déclaré du parcours de récupération de mot de passe. Ce dernier parcours n’a pas été retrouvé dans le code examiné.
- **Usage de l’IA : documenté selon les confirmations de l’équipe.** ChatGPT et GitHub Copilot ont été utilisés pendant la recherche et le développement pour l’amélioration de la documentation ; Claude a aidé Abdoulaye GAYE pour des éléments backend. Les deux membres disent avoir relu les résultats, avec une vérification supplémentaire d’Aliou. **Audit de licences : non vérifiable** sans inventaire transitif complet.

## Documents du dossier

- [Présentation du concours](./presentation-concours.md)
- [Analyse du thème](./analyse-du-theme.md)
- [Adéquation de Ndadiée au thème](./adequation-ndadiee-theme.md)
- [Matrice des exigences](./matrice-exigences.md)
- [Preuves fonctionnelles](./preuves-fonctionnelles.md)
- [Preuves techniques](./preuves-techniques.md)
- [Preuves de déploiement](./preuves-deploiement.md)
- [Gouvernance et équipe](./gouvernance-et-equipe.md)
- [Déclaration d’usage de l’IA](./declaration-usage-ia.md)
- [Audit des licences](./audit-licences.md)
- [Limites et écarts](./limites-et-ecarts.md)
- [Checklist des livrables](./checklist-livrables.md)
- [Préparation du jury](./preparation-jury.md)
- [Démonstration finale](./demonstration-finale.md)

## Règle de preuve

Les quatre états utilisés sont définis dans [matrice-exigences.md](./matrice-exigences.md). Une fonctionnalité présente dans le code ne prouve pas qu’elle est déployée, opérationnelle à distance ou présentée au jury. Les responsables restent « à confirmer » tant que l’équipe ne les a pas nommés.
