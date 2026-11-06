# État de préparation à la production

**Évaluation au 6 novembre 2026.** Ce document décrit l’état vérifié dans le dépôt et l’environnement local contrôlé. Il ne prouve ni hébergement ni disponibilité externe.

## Verdict

**Non prêt pour une mise en production démontrée.** Les tests frontend réussissent et les 313 tests backend réussissent sur PostgreSQL temporaire. JWT, seeders et gestion du schéma ont été durcis; Flyway V1 s'applique sur base neuve et une baseline a été testée sur un schéma historique jetable. La compatibilité avec une base de production, les parcours métier end-to-end et le service public restent non vérifiés.

Le projet n’a pas été déployé par cet audit. Le volume PostgreSQL local préexistant n’a pas été démarré, modifié ou supprimé.

## Échelle et état par domaine

| Domaine | Statut de vérification | Préparation / priorité | Éléments constatés et condition de validation |
|---|---|---|---|
| Frontend | **Vérifié** | Partiel / **Moyenne** | `npm run build`, `npm run lint` et `npm run i18n:check` réussissent. Les parcours UI/API restent à tester sur staging. |
| Backend | **Vérifié** | Partiel / **Moyenne** | `./mvnw test` : 313 tests, 0 échec, 0 erreur, 0 ignoré, sur PostgreSQL temporaire sans volume ; migration Flyway automatique comprise. Les parcours métier et intégrations réelles restent à tester. |
| PostgreSQL | **Vérifié en test** | Partiel / **Élevée** | Une base PostgreSQL 17 jetable a servi à la suite et son conteneur a été supprimé ; le service Compose et le volume existant sont restés intacts. Sauvegardes/restauration de production non vérifiées. |
| Docker | **Vérifié** | Incomplet / **Élevée** | `docker-compose.yml` ne définit que PostgreSQL. Aucun Dockerfile pour les deux services applicatifs, proxy ou compose de production trouvé. Fournir des artefacts reproductibles ou une autre méthode prouvée. |
| Profils Spring | **Vérifié dans le dépôt** | À prouver en environnement / **Élevée** | Le profil `prod` fixe `validate` et désactive les seeders ; le profil distant réellement actif n’est pas vérifiable. Prouver l’activation et l’injection des paramètres sur staging/prod. |
| Schéma / migrations | **Vérifié en test** | Bloquant avant base durable / **Critique** | Flyway V1 crée le schéma et Hibernate le valide sur PostgreSQL 17 temporaire. Une baseline historique a aussi été testée. Comparer et sauvegarder le schéma cible avant sa baseline explicite ; l'état de production reste inconnu. |
| JWT et seeders | **Vérifié dans le dépôt et les tests** | À prouver en environnement / **Élevée** | JWT obligatoire, validé au démarrage ; seeders off par défaut, sans mots de passe de repli. Aucun compte distant inspecté. Vérifier la configuration et la base cible. |
| CORS / HTTPS | **Vérifié** | À valider / **Élevée** | CORS défini dans le code avec `frontend.url` et origines localhost ; proxy/TLS de production absents du dépôt. Valider domaine, HTTPS/WSS, headers et règles CORS sur le déploiement. |
| Fichiers | **Non vérifiable** | À valider / **Élevée** | R2/S3 prévu ; le mode automatique peut utiliser le disque local. Aucun bucket ou persistance réelle vérifié. Tester accès, URL publique et restauration. |
| SMTP | **Non vérifiable** | À valider / **Moyenne** | Profil prod configure SMTP et attend des identifiants d’environnement. Tester l’envoi depuis staging sans données réelles. |
| GitHub | **Non vérifiable** | À valider / **Moyenne** | Client et synchronisation présents ; configuration externe et quota non vérifiés. Tester droits minimaux et synchronisation. |
| Logs / monitoring | **Vérifié** | Incomplet / **Moyenne** | Logs applicatifs standards ; aucune configuration de centralisation, métriques ou alertes trouvée. Mettre en place disponibilité, erreurs, ressources et alertes. |
| Sauvegardes / restauration | **Vérifié** | Bloquant / **Élevée** | Aucune procédure automatisée ni preuve de restauration observée. Produire et réussir un exercice de restauration documenté. |
| Datacloud / URL publique | **Non vérifiable** | Bloquant pour la preuve CADEV / **Élevée** | Aucun manifeste ou URL publique fourni ; aucun test externe effectué. Collecter URL et preuves datées, dont l’hébergeur exigé par le règlement applicable. |

Les termes « bloquant » et « non prêt » désignent les exigences à satisfaire avant lancement ; ils ne signifient pas qu’un service actuellement exposé a été compromis.

## Inventaire de déploiement

### Présent

- [docker-compose.yml](../../docker-compose.yml) pour PostgreSQL local uniquement.
- Configuration Spring générale et un overlay [application-prod.yaml](../../backend/src/main/resources/application-prod.yaml).
- Variables documentées dans [.env.example](../../.env.example) et `frontend/.env.example`.
- Frontend Vite compilable en artefact statique.
- Backend Spring compilable et suite de tests existante.

### Absent ou non démontré

- Dockerfiles ou images applicatives publiées.
- Compose ou manifestes d’orchestration production.
- reverse proxy, domaine, HTTPS/WSS et firewall documentés.
- preuve de compatibilité et baseline contrôlée de toute base historique cible.
- configuration d’un stockage objet réellement opérationnel.
- stratégie de sauvegarde, restauration, supervision et alerting exécutée.
- injection/rotation des secrets sur une infrastructure.
- service accessible publiquement, URL Datacloud et preuves de fonctionnement.

## Porte de sortie avant production

- [ ] Clé JWT de production valide et injectée hors dépôt ; paramètres runtime vérifiés sans révéler leur valeur.
- [ ] `SEED_ENABLED=false` effectif ; absence de comptes de démonstration vérifiée sur la base cible.
- [ ] Compatibilité du schéma de la base cible avec V1 vérifiée sur une sauvegarde ; baseline version 1 effectuée seulement si le schéma correspond.
- [ ] Migration V1 et migrations ultérieures validées en staging avant déploiement durable.
- [x] Suite backend complète exécutée sur PostgreSQL isolé : 313 tests, 0 échec, 0 erreur, 0 ignoré.
- [ ] Frontend configuré vers le backend de l’environnement ; CORS restreint au domaine de production.
- [ ] HTTPS/WSS et politique de headers vérifiés.
- [ ] Stockage fichiers persistant et autorisations contrôlés.
- [ ] SMTP et GitHub validés sans exposer leurs secrets.
- [ ] Sauvegarde puis restauration effectivement testées.
- [ ] Logs, métriques, alertes et procédure de retour arrière opérationnels.
- [ ] Parcours métier testés sur staging avec données synthétiques.
- [ ] URL publique, hébergeur et preuve Datacloud collectés si exigés.

Ne cocher ces éléments qu’avec une preuve reproductible et datée. Pour le détail des risques et des tests, voir l’[audit opérationnel](../08-qualite-securite/audit-operationnel.md) et la [procédure de mise en production](./procedure-de-mise-en-production.md).
