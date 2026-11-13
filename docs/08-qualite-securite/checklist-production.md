# Checklist de sécurité et qualité avant production

## Application et données

- [ ] Le profil Spring de production attendu est activé explicitement.
- [ ] Le profil `prod` est actif et les variables critiques sont injectées sur l'environnement cible.
- [ ] Une clé JWT Base64 forte, d'au moins 256 bits, est injectée hors dépôt ; le backend refuse une clé vide ou invalide.
- [ ] `ddl-auto=validate` est effectif ; migrations versionnées sont créées, relues et appliquées avant le démarrage.
- [ ] `SEED_ENABLED=false` est effectif ; aucun compte de démonstration n'est présent dans la base de production.
- [ ] Les identifiants PostgreSQL sont spécifiques à l'environnement et l'accès réseau est privé.
- [ ] Une sauvegarde PostgreSQL a été restaurée avec succès sur un environnement de test.
- [ ] Le stockage média de production est durable et accessible depuis chaque instance.

## Authentification et secrets

- [ ] Clé JWT forte injectée via un gestionnaire de secrets.
- [ ] Aucune valeur secrète présente dans Git, les logs ou la documentation.
- [ ] Processus de rotation/révocation défini pour JWT, GitHub, R2 et SMTP.
- [ ] Les tests des permissions admin et des comptes suspendus sont réussis.
- [ ] Risque de stockage des tokens navigateur évalué et décision documentée.

## Réseau et Web

- [ ] Frontend et API servis en HTTPS ; WebSocket en WSS.
- [ ] CORS limité à l'origine de production exacte.
- [ ] En-têtes de sécurité configurés au proxy/serveur web et contrôlés.
- [ ] La base et les ports internes ne sont pas exposés publiquement.
- [ ] Routes privées et publiques vérifiées par tests fonctionnels.

## Fichiers, abus et observabilité

- [ ] Taille, format et quotas d'upload validés en staging.
- [ ] Quotas compatibles avec le nombre d'instances ou limitation à une instance documentée.
- [ ] Limites de requêtes et mécanismes anti-abus définis.
- [ ] Logs centralisés, rotation et alertes de disponibilité configurées.
- [ ] Mesures de performance et seuils d'erreurs observés en staging.

## Tests et dépendances

- [x] Suite backend complète exécutée sur PostgreSQL temporaire sans volume : 313 tests, 0 échec, 0 erreur, 0 ignoré (6 novembre 2026).
- [ ] Lint, build et contrôle i18n frontend réussis.
- [ ] Tests frontend automatisés ajoutés et exécutés pour les parcours critiques.
- [ ] Scan de dépendances Maven/npm réalisé et alertes vérifiées.
- [ ] Rapports de tests conservés comme artefacts de livraison.

## Preuves de mise en production

- [ ] URL publique testée depuis un réseau externe.
- [ ] Captures d'écran frontend et résultat des parcours principaux archivés.
- [ ] Vérification d'inscription, connexion, création de projet et messages réalisée.
- [ ] Endpoints, certificats TLS et WebSocket vérifiés sur le domaine public.
- [ ] Versions déployées, date de mise en ligne et environnement consignés.

Une case cochée nécessite une preuve vérifiable. Le contenu de cette checklist ne constitue pas une attestation que l'environnement actuel satisfait déjà ces exigences.
