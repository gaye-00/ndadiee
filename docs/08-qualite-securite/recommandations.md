# Recommandations

## Priorité 0 — avant toute mise en production

1. **Schéma PostgreSQL** — Flyway V1 et Hibernate `validate` sont en place et testés sur PostgreSQL temporaire. Avant production, sauvegarder et comparer le schéma historique cible à V1, puis effectuer une baseline explicite uniquement s'il correspond. Références : [application.yaml](../../backend/src/main/resources/application.yaml), [V1__initial_schema.sql](../../backend/src/main/resources/db/migration/V1__initial_schema.sql).
2. **Secrets et données démo** — la clé JWT n'a plus de fallback et les seeders sont désactivés par défaut ; vérifier l'injection des secrets et l'absence de comptes de démonstration sur l'environnement réel. Références : [application.yaml](../../backend/src/main/resources/application.yaml), [.env.example](../../.env.example).
3. **Dépendances** — exécuter un audit des dépendances Maven et npm dans la CI et évaluer les avis datés ; cet audit n'a pas été effectué ici.
4. **Infrastructure Web** — vérifier HTTPS/WSS, domaine, CORS exact, en-têtes de sécurité, réseau privé DB et stockage.
5. **Sauvegardes** — vérifier une sauvegarde/restauration PostgreSQL et la résilience des médias.

## Priorité 1 — réduire les risques applicatifs

1. Réévaluer le stockage de jetons dans `localStorage` et documenter la stratégie de protection contre XSS.
2. Ajouter des tests frontend automatisés aux parcours de connexion, autorisation, formulaires et erreurs API.
3. Ajouter des tests d'intégration STOMP et des tests de propriété/permission sur ressources.
4. Rendre les quotas et limitations cohérents en déploiement multi-instance.
5. Centraliser les journaux et établir des alertes d'indisponibilité et d'erreurs 5xx.

## Priorité 2 — améliorer la maintenabilité et l'observabilité

- Ajouter des mesures de couverture et des seuils CI réalistes.
- Mesurer les temps de réponse et les requêtes lentes en staging.
- Formaliser un processus de mise à jour des dépendances et de revue des licences.
- Maintenir la documentation de production synchronisée avec les manifests réellement déployés.

## État des findings

La revue de sécurité ciblée n'a identifié aucune vulnérabilité confirmée. Les recommandations ci-dessus correspondent à des risques de configuration, des lacunes d'assurance ou des améliorations préventives, pas à des exploits démontrés.
