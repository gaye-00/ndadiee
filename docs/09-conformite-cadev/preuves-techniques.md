# Preuves techniques

## Éléments inspectés

| Sujet | Preuve disponible | Ce que cela établit | Ce que cela n’établit pas |
|---|---|---|---|
| Backend | [backend/pom.xml](../../backend/pom.xml), packages Java sous `backend/src/main/java` | Stack Maven/Java/Spring déclarée et code présent | Déploiement, absence de défauts ou qualité complète |
| Frontend | [frontend/package.json](../../frontend/package.json), [frontend/src](../../frontend/src) | React, TypeScript, Vite et scripts disponibles | Qualité UX réelle sur toutes plateformes |
| Base | [docker-compose.yml](../../docker-compose.yml), [application.yaml](../../backend/src/main/resources/application.yaml) | PostgreSQL local attendu et configuration de connexion | Résilience/backup de production |
| Sécurité | [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java), [JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java) | Contrôles JWT/permissions déclarés dans le code | Configuration effective et sécurité d’un hôte distant |
| Tests ciblés | Tests backend sélectionnés, lint et contrôle i18n exécutés | Ces commandes particulières ont réussi dans l’environnement d’audit | Suite complète, couverture, charge ou CI |
| Déploiement | Aucun Dockerfile ou manifeste d’hébergement repéré | Manifeste manquant dans l’arborescence inspectée | Absence de déploiement manuel hors dépôt |

## Résultats de commandes disponibles

- `./mvnw -q -Dtest=AdminSecurityTest,AuthenticationServiceTest,StorageConfigurationTest test` : réussite.
- `npm run lint` : réussite.
- `npm run i18n:check` : réussite, mêmes clés dans 10 langues et 12 espaces de noms.
- `npm run build` : réussite lors d’une vérification antérieure des documents de développement.
- Suite backend complète : non exécutée ici ; le test de contexte global requiert PostgreSQL.
- Scan des advisories et licences de dépendances : non exécuté dans le cadre de ce dossier.

## À fournir au jury

- lien d’un pipeline CI réussi et daté ;
- versions exactes des commits présentés ;
- rapport de tests complet et couverture, si mesurée ;
- résultats de tests sur la version publique ;
- confirmation humaine des contributions et de la maîtrise technique par les membres.
