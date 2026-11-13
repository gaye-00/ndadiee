# Validation finale CADEV

Cette page est une porte de validation synthétique, pas une seconde checklist détaillée. Pour les vérifications et preuves par domaine, utiliser la [checklist des livrables CADEV](09-conformite-cadev/checklist-livrables.md).

## État au 13 novembre 2026

| Condition ou preuve | État actuel |
|---|---|
| Dépôt Git du projet | Présent et accessible : [github.com/gaye-00/ndadiee](https://github.com/gaye-00/ndadiee). Le commit final de remise est à indiquer après le dernier push. |
| Démonstration en ligne | Site [https://ndadiee.com/](https://ndadiee.com/) répond HTTP 200 en HTTPS depuis le contrôle externe du 13 novembre. |
| Vidéo de démonstration | Fournie : [Ndadiée : la plateforme de collaboration des développeurs africains](https://youtu.be/Xv030XysB88). YouTube expose le titre et les métadonnées ; le navigateur utilisé lors de l’audit n’a pas décodé le flux. |
| Projet hébergé et utilisable | Hébergement Systalink/Datacloud et fonctionnement de l’API, de la base et des parcours confirmés par l’équipe ; l’API et les parcours n’ont pas été rejoués indépendamment dans cet audit. |
| Équipe | Deux membres inscrits confirmés par l’équipe : Abdoulaye GAYE et Aliou DIOP. |
| Règlement | L’équipe confirme que le résumé des conditions dans le dossier correspond aux conditions reçues. |
| Version remise | À fixer : relier le commit final au contenu de la vidéo et à la version présentée. |

## Dernières actions avant remise

- [ ] L’équipe visionne et valide la vidéo fournie, ses parcours et l’absence de données sensibles.
- [ ] Identifier le commit final remis au jury et confirmer qu’il correspond à la version présentée.
- [ ] Vérifier qu’aucun secret ou fichier `.env` réel n’est inclus dans la version soumise.
- [ ] Localiser ou retirer des affirmations de démonstration le parcours « mot de passe oublié » déclaré ajouté par Abdoulaye ; aucun code correspondant n’a été trouvé dans le dépôt audité.
- [ ] Compléter l’inventaire des licences si requis par le règlement ou avant toute déclaration de conformité des licences.
- [ ] Faire approuver les rôles, contributions et déclaration IA par les deux membres, et suivre le formulaire officiel s’il existe.
- [ ] Archiver les preuves expurgées d’hébergement et d’inscription si le jury les demande.

La copie vidéo locale `videos/ndadiee_demo_bas.mp4` fait environ 173 MiB et n’est pas incluse dans le Git standard ; le lien YouTube est la copie de partage.

## Références de validation

- [Checklist détaillée des livrables](09-conformite-cadev/checklist-livrables.md)
- [Matrice des exigences](09-conformite-cadev/matrice-exigences.md)
- [Preuves de déploiement](09-conformite-cadev/preuves-deploiement.md)
- [Scénario de démonstration](scenario-demonstration.md)
- [Plan des actions restantes](plan-actions-restantes.md)

## Approbation de l’équipe

| Champ | À compléter par l’équipe |
|---|---|
| Version / commit présenté | À inscrire après le dernier push |
| URL publique | https://ndadiee.com/ |
| Dépôt | https://github.com/gaye-00/ndadiee |
| Vidéo | https://youtu.be/Xv030XysB88 |
| Membres ayant validé le dossier | Abdoulaye GAYE et Aliou DIOP (confirmation de l’équipe) |
| Date de validation finale | À confirmer par l’équipe |
| Réserves restant ouvertes | Revue humaine de la vidéo, commit remis, récupération de mot de passe non retrouvée dans le code, licences si requises |
