# Gestion des secrets

## Configuration constatée

[application.yaml](../../backend/src/main/resources/application.yaml) définit des variables d'environnement pour la clé JWT, les identifiants PostgreSQL, les comptes de démonstration, GitHub, le SMTP et Cloudflare R2. Le fichier [.env.example](../../.env.example) documente ces noms de variables.

Le profil [application-prod.yaml](../../backend/src/main/resources/application-prod.yaml) lit le mot de passe SMTP via variable d'environnement et active l'envoi d'emails. Les fichiers ne prouvent pas comment les variables sont injectées sur une infrastructure réelle.

## Risques à traiter

- Certaines valeurs de développement existent comme valeurs par défaut dans `application.yaml`.
- Les seeders sont activés par défaut dans la configuration générale.
- Le dépôt ne contient pas de preuve d'un gestionnaire de secrets ou d'une politique de rotation pour un environnement déployé.
- Les jetons de session côté navigateur sont enregistrés en `localStorage` ; ils ne sont pas des secrets de déploiement, mais exigent une protection stricte contre les scripts injectés.

## Exigences de production

1. Remplacer toutes les valeurs par défaut de développement.
2. Générer une clé JWT de forte entropie et la stocker dans un gestionnaire de secrets.
3. Définir `SEED_ENABLED=false` et vérifier qu'aucun compte démo n'est créé.
4. Restreindre les droits GitHub et R2 au minimum nécessaire.
5. Ne jamais déposer `.env`, tokens ou identifiants de service dans Git, les logs ou les captures.
6. Faire tourner les secrets après exposition présumée, puis invalider l'accès ancien.
7. Limiter l'accès aux secrets aux opérateurs et processus qui en ont réellement besoin.

## Vérifications à conserver

- liste des noms de variables par environnement, sans leurs valeurs ;
- preuve que les secrets sont injectés depuis un coffre ou une plateforme sécurisée ;
- revue de l'historique Git pour détecter les secrets accidentellement commités ;
- preuve de rotation et de révocation lorsqu'une clé est remplacée.

Ne pas copier les valeurs réelles de `.env` ou de la configuration dans les documents.
