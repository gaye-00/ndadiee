# Maintenance

La maintenance d’un environnement Ndadiée repose sur des actions régulières de suivi, mise à jour et vérification. Le dépôt n’apporte pas de procédure de maintenance complète, mais les composants applicatifs et infrastructurels de base permettent d’établir une base solide.

## 1. Maintenance applicative

### Backend

- vérifier la stabilité du service Spring Boot,
- contrôler la clé JWT et le déploiement de nouvelles versions,
- surveiller les erreurs liées à l’authentification, au stockage et à la synchronisation GitHub,
- valider les dépendances au fil des mises à jour.

### Frontend

- valider le build Vite,
- vérifier les URLs public API,
- tester les routes publiques et protégées,
- valider les changements d’interface et les traductions.

## 2. Maintenance PostgreSQL

- surveiller l’espace disque,
- contrôler les performances des requêtes,
- vérifier les sauvegardes,
- tester les restaurations ponctuelles.

## 3. Maintenance du stockage objet

- vérifier la disponibilité du bucket,
- surveiller les volumes d’upload,
- détecter les fichiers orphelins,
- contrôler la taille et la qualité des médias.

## 4. Plan de maintenance recommandé

- quotidien : contrôle de l’état des services, vérification des logs, validation de l’API,
- hebdomadaire : revue des sauvegardes, validation du stockage, contrôle des dépendances,
- mensuel : revue sécurité et environnement, tests de restauration, revue du plan de production.

## 5. Limites du dépôt

Le dépôt ne documente ni la politique de maintenance récurrente ni la procédure d’upgrade de production, ce qui doit être ajouté lors de la mise en ligne effective.

## Sources

- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [docker-compose.yml](../../docker-compose.yml)
- [frontend/package.json](../../frontend/package.json)
- [.env.example](../../.env.example)
