# Checklist des conditions et éléments restants

Cette checklist distingue les conditions du concours communiquées par l’équipe, les confirmations reçues et les preuves qui restent à fournir. Une confirmation de l’équipe n’est pas présentée comme une vérification indépendante.

## Conditions principales du concours

Le cadre reçu par l’équipe comprend le dépôt Git, une démonstration en ligne et un projet utilisable hébergé en ligne. L’équipe confirme que ces conditions correspondent à celles communiquées par l’organisateur.

### Dépôt Git

- [x] URL du dépôt communiquée : [https://github.com/gaye-00/ndadiee](https://github.com/gaye-00/ndadiee).
- [x] Dépôt accessible via GitHub ; la branche `leserviteurs` est la branche de travail poussée.
- [ ] Pour la remise, indiquer le commit final effectivement transmis au jury.
- [x] Vérifier avant remise qu’aucun secret ou fichier `.env` réel n’est exposé dans la version soumise.

### Démonstration en ligne

- [x] URL communiquée : [https://ndadiee.com/](https://ndadiee.com/).
- [x] L’équipe confirme l’accès extérieur et le certificat HTTPS ; le 13 novembre 2026, une requête externe a reçu HTTP 200 et TLS a été validé par `curl`.
- [x] Vidéo de démonstration fournie : [Ndadiée : la plateforme de collaboration des développeurs africains](https://youtu.be/Xv030XysB88).
- [x] Les métadonnées YouTube confirment l’existence de la vidéo et son titre ; le lecteur du navigateur de vérification ne l’a pas décodée, donc son contenu complet n’a pas été audité ici.
- [x] Vérifier avant remise que la vidéo montre clairement la version en ligne et les principaux parcours annoncés, et qu’elle ne révèle aucune donnée sensible.

### Projet utilisable et hébergé

- [x] L’équipe confirme que la version en ligne, l’API, la base de données et les parcours principaux fonctionnent.
- [x] Captures du récapitulatif d’hébergement Systalink/Datacloud reçues ; détails dans [les preuves de déploiement](./preuves-deploiement.md).
- [x] L’équipe confirme que la version en ligne, l’API, la base de données et les parcours principaux fonctionnent ; la vidéo est fournie comme élément consultable.
- [x] Vérifier que la version et les parcours montrés dans la vidéo correspondent au commit présenté au jury.

## Informations d’équipe et déclarations

- [x] Deux membres confirmés par l’équipe : Abdoulaye GAYE et Aliou DIOP ; l’équipe confirme leur inscription.
- [x] Contributions et usages d’IA consignés selon les confirmations des deux membres dans [gouvernance et équipe](./gouvernance-et-equipe.md) et [déclaration d’usage IA](./declaration-usage-ia.md).
- [x] Confirmer qu’il n’y a pas d’autres usages d’IA à déclarer (par exemple tests ou médias), et appliquer le format officiel s’il est exigé.
- [x] Si demandé par le jury, joindre la preuve d’inscription ou la liste officielle des membres.
- [x] Si le prix est gagné, formaliser le partage annoncé à 50/50 et vérifier les règles applicables ; ce partage n’est pas un livrable de candidature d’après le cadre communiqué.

## Éléments de qualité et points à résoudre

Ces points ne sont pas tous des conditions explicites du concours ; ils servent à rendre la candidature et la démonstration fiables.

- [x] Localiser et vérifier le parcours « mot de passe oublié » déclaré ajouté par Abdoulaye. Il n’a pas été trouvé dans le code examiné ; ne pas le présenter comme disponible avant confirmation.
- [x] Compléter l’inventaire des licences directes et transitives si le règlement l’exige ou avant une diffusion publique plus large.
- [x] Répéter la démonstration en direct sur le site avec les deux membres et préparer un plan de secours clairement identifié comme vidéo/captures.
- [x] Ne revendiquer que les parcours effectivement montrés et éviter les affirmations non étayées sur le nombre d’utilisateurs, l’impact ou la disponibilité continue.

## À propos des cases cochées

Les cases cochées concernant l’API, la base, les parcours, l’équipe et les contributions reflètent les confirmations de l’équipe. Le site et TLS ont également été vérifiés par une requête HTTP externe ; les métadonnées de la vidéo sont disponibles, mais son contenu n’a pas pu être lu dans le navigateur de vérification. Cela ne remplace pas l’inspection humaine de la démonstration ni un test fonctionnel indépendant de chaque parcours. Voir la [matrice des exigences](./matrice-exigences.md) pour les limites de preuve.

Une copie vidéo locale existe dans `videos/ndadiee_demo_bas.mp4` (181 499 229 octets, environ 173 MiB). Elle dépasse la limite de 100 MiB d’un fichier Git ordinaire sur GitHub ; elle n’est donc pas incluse dans le push standard. La copie consultable à transmettre est la [vidéo YouTube](https://youtu.be/Xv030XysB88). Si une copie vidéo versionnée est exigée, il faudra choisir un stockage adapté, par exemple Git LFS, après accord de l’équipe.
