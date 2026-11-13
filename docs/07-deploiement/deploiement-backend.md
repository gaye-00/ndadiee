# Déploiement du backend

Le backend est une application Spring Boot Java 21. Les fichiers de configuration du dépôt montrent qu’il s’exécute sur le port 8080 avec le contexte `/api`.

## 1. Point de configuration réel

Le cœur du paramétrage est dans [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml).

Paramètres clés observés :

- `server.servlet.context-path: /api`
- `server.port: ${SERVER_PORT:8080}`
- `spring.datasource.*`
- `jwt.secret` et expirations
- `ndadiee.storage.*`
- `ndadiee.github.*`
- `springdoc.swagger-ui.path: /swagger-ui.html`

## 2. Exécution locale actuelle

```bash
cd backend
./mvnw spring-boot:run
```

La commande correspond à la documentation du dépôt et aux scripts observés dans [backend/README.md](../../backend/README.md).

## 3. Déploiement de production recommandé

### Prérequis

- Java 21 installé sur la machine cible ou dans un runtime conteneurisé,
- PostgreSQL accessible,
- secrets externes configurés,
- dépendances Cloudflare R2 / GitHub / SMTP si activées.

### Sécurité de production

- ne pas exposer la base au public,
- ne pas héberger les secrets dans le dépôt,
- utiliser le domaine public exact dans `FRONTEND_URL`,
- activer le mode production de Spring selon les besoins de l’infra.

## 4. Points d’attention

- le backend utilise un JWT avec une clé de signature ; elle doit être forte et non reconstruite aléatoirement à chaque redémarrage,
- Flyway applique les migrations SQL versionnées avant la validation Hibernate (`ddl-auto=validate`) ; une base historique nécessite une baseline explicite après sauvegarde et comparaison avec V1,
- R2 est une dépendance d’intégration à toujours vérifier en environnement réel.

## 5. Preuves à collecter avant validation

- URL publique du backend accessible en HTTPS,
- endpoint `/api/swagger-ui.html` disponible si Swagger est activé,
- réponse HTTP 200/401/403 selon les endpoints publics/protégés,
- logs démontrant le démarrage correct du service.

## Sources

- [backend/src/main/resources/application.yaml](../../backend/src/main/resources/application.yaml)
- [backend/README.md](../../backend/README.md)
- [backend/pom.xml](../../backend/pom.xml)
- [backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
