# Hackathons

Statut : Implémenté.

## Présentation

Le module hackathons vise à organiser des compétitions de développement, avec équipes, résultats et classement. L’API et l’UI proposent une gestion complète de l’événement, de son inscription et de son palmarès.

## Objectif

Créer des événements de collaboration pour réunir des équipes autour de défis techniques et de projets de démonstration.

## Utilisateurs concernés

- participants,
- porteurs de projet,
- modérateurs / organisateurs,
- visiteurs en lecture publique.

## Fonctionnement

Le backend expose les listes de hackathons par statut, leurs détails, leurs équipes et les résultats. Un membre peut inscrire son projet en tant qu’équipe et la retirer avant clôture. Pour les rôles de modération : création, mise à jour, suppression et attribution d’un classement.

## Parcours utilisateur

- un organisateur publie un hackathon,
- les équipes s’inscrivent avec un projet,
- les visiteurs consultent les détails et les équipes,
- une fois l’événement terminé, l’admin ou le modérateur publie les résultats.

## Règles métier

- les inscriptions sont autorisées avant la clôture des inscriptions,
- les équipes sont liées à un projet existant,
- les résultats ne sont attribués qu’après le terme de l’événement,
- l’API distingue public vs. espace membre vs. modération.

## Permissions nécessaires

- public pour lecture des hackathons et des équipes,
- authentifié pour s’inscrire ou retirer une équipe,
- modération pour créer / modifier / supprimer, ou attribuer le résultat.

## API associées

- `GET /v1/hackathons`
- `GET /v1/hackathons/{slug}`
- `GET /v1/hackathons/{id}/teams`
- `GET /v1/hackathons/me`
- `POST /v1/hackathons/{id}/teams`
- `DELETE /v1/hackathons/{id}/teams/{projectId}`
- `POST /v1/hackathons`
- `PUT /v1/hackathons/{id}`
- `DELETE /v1/hackathons/{id}`
- `PUT /v1/hackathons/{id}/teams/{projectId}/result`

## Composants frontend concernés

- [frontend/src/pages/hackathons/HackathonsPage.tsx](../../frontend/src/pages/hackathons/HackathonsPage.tsx)
- [frontend/src/pages/hackathons/HackathonPage.tsx](../../frontend/src/pages/hackathons/HackathonPage.tsx)
- [frontend/src/hooks/useHackathons.ts](../../frontend/src/hooks/useHackathons.ts)

## Entités et relations concernées

- `Hackathon`, `HackathonTeam`, `HackathonMilestone`, `HackathonPrize` dans [backend/src/main/java/com/hautetech/ndadiee/model/hackathon](../../backend/src/main/java/com/hautetech/ndadiee/model/hackathon)
- `Project` comme équipe participant

## État d’implémentation

Implémenté.

## Limites connues

- le dépôt montre un module opérationnel, mais il n’existe pas de preuve de mise en scène de compétition réelle et de résultats in situ dans l’environnement visible.

## Fichiers source vérifiés

- [backend/src/main/java/com/hautetech/ndadiee/controller/HackathonController.java](../../backend/src/main/java/com/hautetech/ndadiee/controller/HackathonController.java)
- [backend/src/main/java/com/hautetech/ndadiee/service/hackathon/HackathonService.java](../../backend/src/main/java/com/hautetech/ndadiee/service/hackathon/HackathonService.java)
- [frontend/src/pages/hackathons/HackathonPage.tsx](../../frontend/src/pages/hackathons/HackathonPage.tsx)
