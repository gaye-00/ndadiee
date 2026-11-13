# Démonstration finale

Site communiqué par l’équipe : [https://ndadiee.com/](https://ndadiee.com/). Vidéo de démonstration fournie : [Ndadiée : la plateforme de collaboration des développeurs africains](https://youtu.be/Xv030XysB88).

Le site a répondu HTTP 200 en HTTPS le 13 novembre 2026. YouTube expose le titre et les métadonnées de la vidéo, mais le navigateur de l’audit n’a pas décodé le flux. L’équipe doit confirmer que le contenu vidéo montre les parcours prévus et la version qui sera présentée.

## Avant la démonstration

- [x] Tester l’URL publique depuis un réseau extérieur : HTTP 200 le 13 novembre 2026.
- [x] Vérifier l’établissement HTTPS au niveau HTTP/TLS ; vérifier séparément les flux API/WebSocket si utilisés dans la démonstration.
- [ ] Utiliser un compte de démonstration non privilégié et des données préparées sans données personnelles.
- [ ] Vérifier que les services externes nécessaires sont disponibles.
- [x] Vidéo de secours disponible à l’adresse YouTube ci-dessus.
- [ ] Noter le commit correspondant à la version démontrée après validation humaine de la vidéo.
- [ ] Ne pas afficher secrets, tokens, logs personnels ou console contenant des données sensibles.

## Parcours possible (à valider sur l’instance)

1. Ouvrir la plateforme et présenter sa proposition de valeur.
2. Montrer la découverte des projets et profils.
3. Ouvrir un projet et présenter son espace d’équipe ou les rôles recherchés.
4. Montrer une interaction communautaire (forum ou messagerie).
5. Montrer la revue de code ou l’intégration GitHub si les données externes sont disponibles.
6. Expliquer le contrôle d’accès et le cycle de vie des données associé.
7. Présenter un résultat mesurable uniquement si une source et une méthode de mesure existent.

## Repli en cas d’incident

- indiquer clairement que la démonstration en direct rencontre un incident ;
- utiliser une capture ou vidéo préenregistrée identifiée comme telle ;
- ne pas prétendre qu’une capture prouve la disponibilité du service au moment du jury ;
- conserver l’incident et son heure pour suivi après la présentation.

## Après la répétition

Consigner la date, le navigateur, l’URL, le commit testé, les scénarios réussis/échoués et les corrections nécessaires. L’équipe confirme les principaux parcours ; aucun parcours complet n’a été rejoué par l’audit présent.
