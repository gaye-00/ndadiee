# Qualité et sécurité

Cette section rassemble les constats de qualité et de sécurité établis à partir du dépôt Ndadiée. Les vérifications locales exécutées sont distinguées des vérifications non effectuées. Une absence de finding lors d'une revue ciblée ne vaut pas certification de sécurité.

## Synthèse de l'audit

| Domaine | Constat | État |
|---|---|---|
| Authentification et autorisations | JWT d'accès et de renouvellement, règles d'URL et contrôles métier ; tests ciblés d'authentification et de l'accès administrateur présents | Examiné ; tests ciblés exécutés |
| WebSocket | Authentification STOMP sur `CONNECT`, destinations `SUBSCRIBE` et `SEND` limitées | Examiné dans le code ; pas de test WebSocket exécuté |
| Validation et erreurs | DTO annotés, `@Valid` sur plusieurs contrôleurs, gestionnaire d'exceptions centralisé | Examiné |
| Téléversements | Contrôles de type par signature d'image, taille et quota en mémoire par instance | Examiné ; tests ciblés de stockage exécutés |
| Frontend | Les jetons sont conservés dans `localStorage` ; Markdown rendu avec `skipHtml` et restrictions de liens | Examiné ; risque de sécurité résiduel décrit, pas de vulnérabilité exploitée |
| Tests | 46 fichiers de test Java repérés ; aucun fichier frontend `*.test.*` ou `*.spec.*` repéré | Inventaire local |
| Dépendances | Manifestes Maven/npm présents | Advisories actuels et audit complet transitif non vérifiés |
| Production | Profils et variables existent, mais le dépôt ne fournit pas de preuve d'environnement hébergé | Non vérifié |
| Audit opérationnel | Contrôles frontend réussis ; 313 tests backend réussis ; JWT/seeders durcis ; Flyway V1 et baseline temporaire testées ; compatibilité de la base réelle et preuve de déploiement manquantes | Vérifié localement le 6 novembre 2026 |

La revue de sécurité déléguée n'a signalé aucune vulnérabilité confirmée dans les éléments examinés. Cette conclusion est limitée à son périmètre et ne remplace ni un audit exhaustif ni une analyse des dépendances contre une base d'avis à jour.

## Documents

- [Stratégie de tests](./strategie-de-tests.md)
- [Tests backend](./tests-backend.md)
- [Tests frontend](./tests-frontend.md)
- [Qualité du code](./qualite-code.md)
- [Audit de sécurité](./audit-securite.md)
- [Authentification et autorisations](./authentification-et-autorisations.md)
- [Gestion des secrets](./gestion-des-secrets.md)
- [CORS et protections Web](./cors-et-protections-web.md)
- [Sécurité des données](./securite-donnees.md)
- [Performances](./performances.md)
- [Risques techniques](./risques-techniques.md)
- [Recommandations](./recommandations.md)
- [Checklist de production](./checklist-production.md)
- [Audit opérationnel](./audit-operationnel.md)
- [Audit fonctionnel approfondi](./audit-fonctionnel.md)
- [Matrice fonctionnelle](./matrice-fonctionnelle.md)
- [État de préparation à la production](../07-deploiement/etat-preparation-production.md)

## Fichiers de référence

- [SecurityConfiguration.java](../../backend/src/main/java/com/hautetech/ndadiee/security/SecurityConfiguration.java)
- [JwtService.java](../../backend/src/main/java/com/hautetech/ndadiee/security/JwtService.java)
- [StompAuthenticationInterceptor.java](../../backend/src/main/java/com/hautetech/ndadiee/security/StompAuthenticationInterceptor.java)
- [GlobalExceptionHandler.java](../../backend/src/main/java/com/hautetech/ndadiee/exception/GlobalExceptionHandler.java)
- [application.yaml](../../backend/src/main/resources/application.yaml)
- [application-prod.yaml](../../backend/src/main/resources/application-prod.yaml)
- [package.json](../../frontend/package.json)
- [pom.xml](../../backend/pom.xml)

## Limites de vérification

Les 313 tests backend et les contrôles frontend mentionnés dans l'audit opérationnel ont été exécutés localement le 6 novembre 2026 ; ils ne constituent pas une validation des parcours fonctionnels de bout en bout décrits dans l'audit fonctionnel. Aucun test intrusif n'a été effectué sur un environnement distant. Aucun environnement de production n'a été audité. Les versions vulnérables éventuelles ne sont pas établies par cette documentation.
