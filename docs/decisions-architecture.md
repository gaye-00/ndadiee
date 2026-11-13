# Décisions d’architecture

## 1. Backend monolithique modulaire
Le backend utilise une structure modulaire par domaine métier plutôt qu’un monolithe classique sans segmentation. Les zones `controller`, `service`, `repository`, `model`, `security`, `initializer` etc. sont séparées.

## 2. Authentification stateless par JWT
La plateforme ne dépend pas de sessions serveur. Les accès sont gérés via des JWT. Cela simplifie la scalabilité horizontale tant qu’aucune session distribuée n’est nécessaire.

## 3. PostgreSQL comme base de données principale
Le schéma est défini par les entités JPA. Cela permet une forte cohérence entre le code Java et la structure DB, mais impose un besoin de migration explicite à l’échelle production.

## 4. Frontend orienté SPA
Le frontend est conçu en SPA via React Router et lazy loading des pages. Cela favorise la réactivité et le chargement progressif des écrans.

## 5. WebSockets STOMP pour la messagerie
Les interactions temps réel basées sur la discussion sont gérées via STOMP au lieu de polling, ce qui réduit la charge réseau et améliore l’expérience utilisateur.

## 6. Stockage externe par S3-compatible
Le support Cloudflare R2 est activable pour les médias, avec un fallback local en développement.

## 7. Données de démonstration incluses
Les seeders chargent des comptes de démonstration et des contenus de test si `ndadiee.seed.enabled=true`.

## 8. Sécurité par permissions de rôle
La sécurité est organisée avec des permissions et des rôles comme `USER`, `MODERATOR`, `ADMIN`. Les règles d’URL et de méthode sont configurées dans le backend.

## 9. Limite actuelle de production
Le dépôt ne fournit pas encore de plan de déploiement complet ni de migration de schéma explicitement testée. C’est aujourd’hui la principale limite d’exploitation industriel.
