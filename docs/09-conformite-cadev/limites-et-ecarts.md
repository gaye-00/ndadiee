# Limites et écarts

## Écarts principaux

| Sujet | État | Preuve manquante | Prochaine action |
|---|---|---|---|
| Démonstration en ligne | Non vérifiable | URL et test d’accès externe | Publier ou fournir une URL et une preuve datée |
| Hébergement Datacloud | Non vérifiable | Attestation/URL ou preuve de plateforme | Confirmer l’exigence et collecter la preuve |
| Disponibilité fonctionnelle en ligne | Non vérifiable | Parcours testés sur l’instance publique | Exécuter les scénarios de démonstration |
| Équipe de 2 à 5 personnes | Non vérifiable | Roster ou inscription officielle | Faire confirmer les membres |
| Contributions individuelles | Non vérifiable | Répartition validée par l’équipe | Préparer une cartographie honnête des contributions |
| Respect du calendrier | Non vérifiable | Historique complet et règle officielle de période | Vérifier les dates et conserver les preuves |
| Usage de l’IA | Non vérifiable | Déclaration collective complète | Interroger chaque membre et consolider |
| Licences transitives | Non vérifiable | Rapport reproductible et revue | Exécuter l’inventaire complet |
| Tests d’interface | Partiellement conforme | Pas de suite de tests frontend repérée | Ajouter/collecter les tests des parcours essentiels |
| Production et exploitation | Non vérifiable | Manifests, TLS, backups, logs et runbooks réellement actifs | Fournir les éléments d’exploitation |

## Incohérences documentaires repérées et corrigées pendant la finalisation

- Le README racine annonçait auparavant Spring Boot 3 ; il indique maintenant Spring Boot `4.1.1`, conformément à [backend/pom.xml](../../backend/pom.xml).
- Les liens du README racine vers la documentation API et CADEV ont été alignés sur les index actuellement présents.
- Le dossier `docs/05-guides-utilisateur/` ne contient aucun guide ; l’index central signale cette absence au lieu de renvoyer vers des fichiers inexistants.
- La présence de fonctions et de routes ne doit pas être présentée comme preuve qu’elles sont disponibles en production.

## Ce qui n’est pas conclu

- Aucun jugement de non-conformité officielle n’est prononcé faute de règlement intégral vérifié.
- Aucun usage historique de l’IA par l’équipe n’est inféré.
- Aucun membre, auteur individuel, licence ou URL de production n’est inventé.
- Aucun déploiement extérieur au dépôt n’est ni affirmé ni nié.
