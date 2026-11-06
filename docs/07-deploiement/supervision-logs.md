# Supervision et logs

Le dépôt ne fournit pas de stack de supervision de production complète. On peut seulement identifier les mécanismes de logs et de diagnostic déjà présents dans l’application et dans le docker local.

## 1. Éléments observés

### Logs backend

Le backend Spring Boot est configuré pour fonctionner avec les logs standards de l’application ; il est possible d’extraire les messages de démarrage, erreurs de requêtes et erreurs métier via les flux standard de sortie.

### Logs PostgreSQL

Le service Docker définit un healthcheck `pg_isready` pour surveiller la disponibilité de la base.

### Logs de service

Le Docker Compose local ne fournit pas de stack de monitoring avancée, ni de centralisation des logs.

## 2. Ce qui manque pour la production

- aucun système de collecte centralisée,
- aucun stockage de logs sur un service externe,
- aucune dashboard de monitoring,
- aucune alerte de disponibilité ou d’erreur métier,
- aucune politique de rotation de logs documentée.

## 3. Recommandation de production

- centraliser les logs backend et reverse proxy dans un système de collecte,
- fournir des alertes sur erreurs HTTP critiques et taux d’erreur,
- consulter les logs d’authentification, de stockage et de synchronisation GitHub,
- vérifier les erreurs de `StompAuthenticationInterceptor` / sécurité et de stockage objet,
- suivre l’utilisation de la base et des fichiers avec métriques simples.

## 4. Checklist de supervision

- disponibilité du backend,
- disponibilité PostgreSQL,
- disponibilité du stockage objet,
- latence moyenne des réponses API,
- échec d’authentification / token,
- erreurs HTTP 5xx,
- saturation disque,
- taux d’upload médias.

## 5. Sources

- [docker-compose.yml](../../docker-compose.yml)
- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
