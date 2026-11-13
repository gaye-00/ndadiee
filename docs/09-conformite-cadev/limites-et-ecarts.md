# Limites et écarts

## Écarts principaux

| Sujet | État | Preuve manquante | Prochaine action |
|---|---|---|---|
| Démonstration en ligne | Site vérifié en HTTPS ; vidéo fournie, contenu à revoir | Le 13 novembre, le site a répondu HTTP 200 en HTTPS ; YouTube expose le titre et les métadonnées de la vidéo, mais son flux n’a pas été décodé par le lecteur d’audit | Visionner la vidéo dans un lecteur compatible et archiver une preuve datée |
| Hébergement Datacloud | Partiellement documenté | Achat déclaré ; captures de configuration et tarif Systalink/Datacloud transmises. L’association effective au site et l’état du serveur restent à vérifier | Conserver une preuve de souscription expurgée et vérifier l’instance |
| Disponibilité fonctionnelle en ligne | Confirmée par l’équipe, vérification indépendante partielle | L’équipe confirme le fonctionnement de la version en ligne, de l’API, de la base et des parcours principaux ; site HTTP 200 vérifié ; vidéo fournie mais non visionnée par l’audit | Examiner la vidéo et noter les parcours montrés |
| Équipe de 2 à 5 personnes | Confirmée par l’équipe | Abdoulaye GAYE et Aliou DIOP confirment leur inscription officielle ; justificatif non joint au dossier | Joindre une preuve d’inscription si le jury la demande |
| Contributions individuelles | Partiellement documentées | L’équipe confirme tests par les deux membres, audit fonctionnel et suggestions par Aliou, ajout du parcours mot de passe oublié par Abdoulaye ; cette dernière fonction n’a pas été trouvée dans le code présent | Vérifier que le changement est dans la version du dépôt ou le présenter comme contribution en attente de preuve |
| Respect du calendrier | Non vérifiable | Historique complet et règle officielle de période | Vérifier les dates et conserver les preuves |
| Usage de l’IA | Partiellement documenté | ChatGPT et GitHub Copilot utilisés pendant la recherche et le développement pour la documentation ; Claude utilisé par Abdoulaye pour le backend ; relecture par les deux, vérification supplémentaire par Aliou, selon l’équipe | Confirmer l’existence d’autres usages et suivre le format officiel s’il est imposé |
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
