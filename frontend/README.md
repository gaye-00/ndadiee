# Ndadiee — frontend

React 19, Vite 8, Tailwind CSS 4, shadcn/ui, TanStack Query, React Router 7, i18next.
Design : Claude Design, **Proposition 3 · L'Atelier collaboratif**, direction visuelle « Kente Signal ».

```bash
npm install
npm run dev          # http://localhost:5173 (backend attendu sur http://localhost:8080/api)
npm run build        # vérification des types + build de production
npm run lint
npm run i18n:check   # toutes les langues ont-elles les mêmes clés que le français ?
```

## Structure

```
src/
├── main.tsx, App.tsx      Point d'entrée : i18n, styles, providers, router
├── styles/                Palette et effets (voir « Design »)
├── i18n/                  Langues, traductions (locales/<langue>/common.json)
├── config/                Nom du site, palette pour le JS, navigation (menus)
├── router/                URL (paths.ts), pages chargées à la demande (pages.ts), routes (index.tsx)
├── providers/             Contextes globaux : cache des données, sens d'écriture, notifications
├── pages/<domaine>/       Une page par route : elle place les composants dans l'ordre des maquettes
├── components/
│   ├── ui/                Briques shadcn et 21st.dev (installées par la CLI shadcn)
│   ├── layout/            Coquilles (Root, Public, App, Shell, Auth, Workspace) et barres de navigation
│   ├── feedback/          Chargement, vide, erreur
│   └── <domaine>/         landing, dashboard, projects, workspace, reviews, openings,
│                          hackathons, forum, profile, messages, notifications, search,
│                          settings, auth, shared
├── hooks/                 Données (useProjects, useQuestions…) et préférences (useTheme, useLanguage…)
├── services/, types/      Appels à l'API et types, alignés sur le backend Java
├── store/                 Session, thème, mode économie de données (zustand)
├── lib/, utils/           cn(), cache des requêtes, préchargement, formats, validation
```

**Les composants sont des coquilles vides** : chacun affiche seulement son nom, avec une ligne
de description et l'écran du design concerné (3A à 3H). Les layouts et les pages les placent déjà
au bon endroit : on implémente un composant sans toucher au reste.

Écrans du design → pages :

| Écran | Page | Fichier |
| --- | --- | --- |
| 3A Accueil visiteur | `/` | `pages/landing/LandingPage.tsx` |
| 3B Atelier (tableau de bord) | `/dashboard` | `pages/dashboard/DashboardPage.tsx` |
| 3C Revue de code | `/projects/:slug/reviews/:number` | `pages/reviews/ReviewPage.tsx` |
| 3D Page projet | `/projects/:slug` | `pages/projects/ProjectPage.tsx` |
| 3E Espace d'équipe (kanban, discussion) | `/projects/:slug/workspace` | `components/layout/WorkspaceLayout.tsx` + `pages/workspace/` |
| 3F Profil | `/u/:username` | `pages/profile/ProfilePage.tsx` |
| 3G Mobile, kanban | même route que 3E | `components/workspace/KanbanColumnSwitcher.tsx`, `components/layout/MobileTabBar.tsx` |
| 3H Recherche Ctrl K et états | partout | `components/search/CommandPalette.tsx`, `components/feedback/` |

« Questions » est devenu **Forum** (`/forum`, `pages/forum/`, `components/forum/`). Côté backend,
un sujet du forum reste une `Question` (`/v1/questions`) : services, types et hooks gardent ce nom.

## Design : palette Kente

Toutes les couleurs sont dans `src/styles/tokens.css`, en thème clair (`:root`) et sombre (`.dark`).
On n'écrit jamais une couleur en dur dans un composant : on utilise les classes Tailwind.

| Rôle | Classes |
| --- | --- |
| Fonds | `bg-background` (nuit / fond clair), `bg-surface`, `bg-surface-raised`, `glass` (carte en verre) |
| Texte | `text-foreground`, `text-soft-foreground`, `text-muted-foreground`, `text-faint-foreground` |
| Accents lisibles | `text-gold`, `text-coral`, `text-jade`, teintes : `bg-jade/12 border-jade/25` |
| Aplats de marque | `bg-kente-gold`, `bg-kente-coral`, `bg-kente-jade` |
| Dégradés | `bg-kente`, `bg-kente-warm` (boutons principaux), `bg-kente-conic` (logo, avatars), `text-kente` |
| Bordures | `border-border`, `border-border-subtle`, `border-border-strong`, `border-glass-border` |
| Code | `bg-code`, `text-code-gutter`, `bg-diff-add`, `bg-diff-remove` |
| Titres (Unbounded) | `font-display` + `text-display`, `text-h1` … `text-h5` (tailles fluides), `text-lead` |
| Données (Geist Mono) | `font-mono`, `eyebrow` (libellé de section) |
| Rayons | `rounded-lg` (boutons, 14 px), `rounded-2xl` (cartes, 22 px), `rounded-3xl` (panneaux, 28 px) |

Effets (`src/styles/effects.css`), en CSS pur : `halo halo-gold|coral|jade`, `border-kente-spin`,
`marquee`, `live-dot`, `skeleton-shimmer`, `hatch`, `kente-stripes`, `animate-float`, `shadow-lift`,
`shadow-glow`, `shadow-float` (barres flottantes). Ils s'arrêtent avec « Réduire les animations » du
système et en mode économie de données. Pour masquer un décor dans ce mode : `saver:hidden`.

Une nouvelle échelle dans `styles/theme.css` (taille de texte, ombre, animation…) doit aussi être
déclarée dans `src/lib/utils.ts` : sans cela, `cn()` la confond avec une couleur et la supprime.

## Thème clair / sombre

`useTheme()` (`src/hooks/useTheme.ts`) : `theme` (`light` | `dark` | `system`), `resolvedTheme`,
`setTheme`. Le choix est mémorisé ; par défaut le site suit l'appareil. Le script de `index.html`
applique le thème avant le premier affichage : pas de flash.

Sur les pages du visiteur, une corde pend en haut à droite (`layout/ThemePullCord.tsx`, bibliothèque
`pullcord`) : on la tire pour changer de thème. `revealTheme(theme, point, animer)` (`src/lib/themeReveal.ts`)
ouvre la nouvelle palette en cercle depuis un point de l'écran ; tout autre bouton de thème peut s'en servir.

## Accueil : le métier à tisser

Sous l'accroche (`landing/HeroSection.tsx`), l'année GitHub du visiteur est tissée comme un kente
(`landing/HeroLoom.tsx`) : un graphe de contributions a la même structure qu'un kente, des bandes
cousues côte à côte (une par semaine) faites de blocs (un par jour), qui alternent fils de chaîne et
fils de trame en damier. Le pagne bascule ensuite en ville en 3D, la nuit ses fenêtres s'allument.

- Dessin : `shared/KenteSkyline.tsx` et son moteur en canvas 2D `shared/kenteSkylineEngine.ts`,
  réutilisable pour la carte des contributions du profil (3F). Données : `src/lib/contributions.ts`.
- Sans pseudo, une année type ; avec, celle du visiteur, gardée pour sa prochaine visite.
- Source : service public `github-contributions-api` (`services/github.service.ts`), seul le pseudo
  lui est envoyé. **À remplacer par un endpoint du backend** (API GraphQL de GitHub, avec un jeton)
  avant d'en dépendre en production.

## Accueil : la bande des rôles

Sous l'accroche, `landing/RolesMarquee.tsx` fait défiler les rôles que cherchent les équipes, comme une
bande de kente qui sort du métier : la chaîne court tout du long en rayures, et chaque rôle est un bloc
de trame où flotte son motif tissé.

- Rôles, motifs, outils et étiquettes : `config/roles.ts`, un catalogue que les annonces pourront reprendre.
  Un motif s'écrit en texte, une ligne par rangée de fils (`#` et `+` les deux couleurs, `o` la couleur
  du texte, `.` rien) ; `shared/WovenMotif.tsx` le tisse en SVG.
- Logos des technologies : Simple Icons (licence CC0), un import par logo dans `lib/stackLogos.ts`,
  affichés en une couleur par `shared/StackLogo.tsx`.
- Quand des projets recrutent pour un rôle (annonces du backend : `GET /v1/openings/roles`, hook
  `useOpeningRoleSummary`), les avatars de leurs porteurs s'ajoutent à son bloc. Les identifiants des
  rôles sont ceux du backend (`TeamRole.java`), en minuscules.
- Mouvement : `hooks/useMarquee.ts`, réutilisable. La bande défile, s'arrête sous la souris ou quand un
  lien reçoit le focus au clavier, se tire et se lance à la souris ou au doigt, et suit un peu le
  défilement de la page. Un bouton la met en pause, et le choix est gardé. Avec les animations réduites
  ou en économie de données, elle reste immobile et se fait défiler à la main.
- Fichier à part (`React.lazy`) : l'accroche s'affiche sans l'attendre.

## Accueil : la vitrine

`landing/ShowcasePreview.tsx` montre les projets les plus étoilés (`SHOWCASE_FILTERS`, six) avec
`projects/ProjectCard.tsx`, la carte de la vitrine : capture, nom, étoiles, accroche, technologies, rôles
recherchés, équipe.

- Combien, selon l'écran : six en deux rangées de trois sur grand écran ; quatre en deux rangées sur
  tablette (une carte demande 350 px) ; quatre à faire glisser sur téléphone, suivies d'une carte « +N
  autres projets » qui mène à la vitrine, avec un fil dessous qui montre où l'on en est. Toujours des
  rangées complètes : avec 4 ou 5 projets, le grand écran en montre 3 plutôt que 3 et 1. Une seule
  requête ; les images des cartes cachées ne sont pas téléchargées.
- Couleurs au survol : vert, or, rouge, décalées d'une rangée à l'autre (en diagonale, comme un tissage).

- Au survol ou au focus : la carte se soulève dans sa couleur, la photo s'approche, les issues « premier
  pas » des rôles ouverts glissent sur l'image, et l'équipe s'écarte pour laisser voir une place vide.
- Couvertures : `shared/LazyImage.tsx` (miniature 640 px ou grande image 1280 px selon l'écran, hachures
  en attendant ; en économie de données, l'image attend qu'on la demande). Le crédit de la photo est
  affiché dessus, avec un lien vers sa source.
- Données : le backend (projets, équipes, annonces), créées par l'init (`ShowcaseSeeder.java`) ; les photos
  viennent de Wikimedia Commons, servies par l'API (`backend/.../static/media/demo`, voir `CREDITS.md`).
- La bande des rôles et la vitrine arrivent dans des fichiers à part ; `LandingPage` lance leurs requêtes
  dès l'arrivée sur la page.

## Accueil : les usages

`landing/FeatureBento.tsx` : les cinq usages de la maquette 3A, en bento (`landing/bento/`), cinq cartes
teintées qui se manipulent. Une lampe suit la souris sur toute la grille : le fond des cartes s'éclaire,
et leurs bords aussi, celles d'à côté comprises.

1. **Se rencontrer** (`MeetCard`) : on choisit sa stack, des fils d'or partent de la technologie vers les
   annonces des projets qui l'utilisent, tirés par une navette de lumière ; chaque annonce mène à son
   projet. Données du backend : `GET /v1/openings/stacks` (les technologies qui ont un logo, en
   privilégiant celles qui mènent à des équipes différentes) et `GET /v1/openings?tag=`. Sans le premier
   (backend pas encore redémarré), six technologies courantes, sans les chiffres.
2. **Échanger** (`ReviewCard`) : une revue de code ligne à ligne ; on applique la suggestion du
   mainteneur, la ligne change, la PR est approuvée d'un tampon. « Utile » donne +10 de réputation.
3. **Partager** (`ShareCard`) : la démo d'un projet dans un téléphone et son devlog ; chaque version du
   journal remet l'appli dans son état. À la première apparition, l'appli rejoue son histoire.
4. **Collaborer** (`TeamCard`) : un vrai kanban. On glisse une carte (souris, stylet), on la touche pour
   l'avancer (doigt), ou on la déplace au clavier (Entrée, flèches). À l'arrivée à l'écran, Tunde, de
   l'équipe, déplace une carte : on voit son curseur, comme dans un éditeur partagé.
5. **Au quotidien** (`DailyCard`) : l'atelier du jour (revues, tâches à cocher) et le vrai réglage
   d'économie de données : l'activer allège tout le site, ce bento compris.

Les cartes 2 à 5 racontent lagos-transit, le projet des maquettes 3B à 3E (personnages d'illustration :
`bento/crew.ts`). Avec les animations réduites ou en économie de données, rien ne se joue tout seul ; les
fils sont tracés d'emblée. Sur téléphone, une colonne, et le kanban se lit colonne après colonne.

## Accueil : la bannière finale

`landing/CtaBanner.tsx` raconte la maquette (« Ton prochain projet commence par une équipe. ») au
défilement, sur une scène fixée à l'écran (`useScroll` de Motion, lissé par un ressort) :

1. « Un fil seul ne fait pas un pagne. » Un fil d'or ondule à travers la première carte, avec la
   communauté en chiffres (`GET /v1/stats` : devs, pays, projets, rôles ouverts et places, comptés à
   l'arrivée à l'écran).
2. Les fils de chaîne se tendent derrière elle, un à un, pendant que l'on descend.
3. La bannière kente monte en se tissant : elle sort d'une ligne de tissage où une navette de lumière fait
   l'aller-retour au rythme du défilement, et reste posée sur son métier. Une étiquette cousue s'y pose à
   la fin (places à prendre, motifs des rôles les plus demandés, lien vers les annonces) ; une lumière de
   soie suit la souris.

Un lien de la bannière qui reçoit le focus au clavier fait aller la scène au bout. Avec les animations
réduites, en économie de données ou sur un écran de moins de 600 px de haut, les deux cartes se suivent
simplement.

## Vitrine

`/showcase` (`pages/showcase/ShowcasePage.tsx`) : tous les projets, à filtrer. L'accroche
(`projects/ShowcaseIntro.tsx`, « Choisis ton projet. Trouve ta place. ») donne la vitrine en chiffres :
projets, pays, projets qui recrutent, places à prendre.

- **Filtres** (`projects/ProjectFilters.tsx`) : d'abord le rôle recherché, une bande comme celle de
  l'accueil : « Tous », « Qui recrutent », puis les treize métiers et leur motif tissé. Un seul choix, aux
  flèches du clavier ; la pastille glisse vers le rôle choisi et prend sa couleur. La bande défile au doigt ou
  avec ses deux boutons, ses bords s'effacent là où d'autres rôles attendent. Puis une barre : la recherche
  (chaque mot, dans le nom, l'accroche, la description ou une technologie ; elle part à la pause dans la
  frappe, « / » y amène), la technologie et le pays du porteur (`shared/FacetPicker.tsx` : une liste qui se
  cherche au clavier, sans accents, et en anglais pour les pays).
- **Facettes** : chaque valeur dit combien de projets elle donnerait avec les autres filtres
  (`GET /v1/projects/facets`). Un rôle sans projet ne se choisit pas ; les listes ne proposent que des
  valeurs qui mènent quelque part.
- **URL** (`hooks/useShowcaseFilters.ts`, sur `hooks/useUrlFilters.ts`) :
  `/showcase?role=mobile&tag=flutter&country=SN&q=…&sort=recent` se partage. Chaque choix ajoute une entrée à
  l'historique (Précédent revient au filtre d'avant), affiner la recherche la remplace. La page projet y
  renvoie par ses technologies (`?tag=`).
- **Grille** (`projects/ProjectGrid.tsx`) : le nombre de projets (« 3 projets sur 13 »), les filtres actifs,
  chacun retiré d'un clic, et l'ordre (les plus étoilés, les plus récents). Les cartes de l'accueil
  (`ProjectCard`), douze à la fois, la suite chargée à l'approche du bas ; en économie de données, à la
  demande. Pendant qu'un filtre charge, la grille d'avant reste, atténuée ; puis les cartes glissent à leur
  nouvelle place. Au bout, en pointillés, la carte d'un projet qui n'existe pas encore : celui du visiteur.
- **Sans résultat** : le métier attend, sans fil de trame ; on efface les filtres, ou on publie le projet qui
  manque.
- Textes : l'espace de noms `showcase` des traductions, téléchargé avec la page.

Les briques des filtres servent aussi aux annonces (`components/shared/`) : `RoleStrip` (la bande des rôles),
`FilterBar` et `FilterSearch` (la barre et sa recherche), `StackPicker` et `CountryPicker` (sur `FacetPicker`),
`ActiveFilters` (les pastilles des filtres choisis), `SortMenu` (l'ordre), et `feedback/LoadMore` (la suite de
la liste). Leurs textes communs sont dans la section `filters` de `common.json`.

## Annonces

`/openings` (`pages/openings/OpeningsPage.tsx`) : les rôles que cherchent les équipes. L'accroche
(`openings/OpeningsIntro.tsx`, « Des équipes te cherchent. Réponds par le code. ») donne les annonces en chiffres :
annonces, projets, pays, places à prendre, annonces encore sans candidature. Un visiteur y apprend qu'une fois
connecté, il verra sa compatibilité avec chaque rôle.

- **Filtres** (`openings/OpeningFilters.tsx`) : ceux de la vitrine, avec les briques partagées. Le rôle (« Toutes »
  puis les treize métiers, avec leur nombre d'annonces), la recherche (chaque mot, dans l'annonce, son issue
  « premier pas » ou son projet : nom, accroche, technologie), la technologie du projet et le pays du porteur.
  Facettes : `GET /v1/openings/facets`.
- **URL** (`hooks/useOpeningBoardFilters.ts`) : `/openings?role=mobile&tag=flutter&country=SN&q=…&sort=recent`.
  L'accueil y mène par un rôle (bande des rôles, `?role=`) ou une technologie (« Se rencontrer », `?tag=`).
- **Ordre** : pour un membre connecté, les plus proches de son profil d'abord (son ordre par défaut) ; sinon les
  plus récentes. Aussi : les moins demandées (le moins de candidatures en attente). Un visiteur qui choisit l'ordre
  du profil passe par la connexion.
- **Carte** (`openings/OpeningCard.tsx`) : une bande de kente. Sur sa lisière, aux couleurs du motif du rôle, le
  motif qui se tisse à l'arrivée à l'écran et les places à prendre en pointillés (au survol, la première s'ouvre :
  celle du visiteur). Puis le rôle, l'intitulé, la compatibilité (anneau, et les compétences qui l'expliquent ;
  les technologies du projet qu'il connaît sont en vert), les conditions (places, candidatures, date), l'issue
  « premier pas » (lien vers GitHub), les technologies et le projet avec son porteur. Toute la carte mène au projet,
  en haut de sa page : on le découvre, puis ses rôles juste dessous. L'annonce la plus proche du profil, dans la
  première page, a la bordure kente qui tourne.
- **Arrivée sur les rôles** (`pages/projects/ProjectPage.tsx`) : un lien qui les annonce (`paths.projectRoles` :
  `#roles`, « Voir les rôles » de la vitrine, la demande de candidature des notifications ; `#role-12`, le rôle
  d'une équipe de hackathon, le retour de la connexion), « Rejoindre l'équipe » et « Ta place ? » font descendre la
  page jusqu'à « On cherche », dont le titre s'arrête sous la barre du haut ; le rôle visé s'éclaire et son bouton
  prend le focus. Sous les rôles, la page garde au moins la hauteur de l'écran :
  sur un projet court ou un grand écran, ils montent quand même jusqu'en haut. Pendant l'arrivée (2,5 s), la page
  revient sur les rôles si autre chose l'en écarte (une position rétablie au premier chargement), sauf si l'on
  défile soi-même. Précédent et Suivant reprennent la page là où on l'avait laissée.
- **Postuler** : la fenêtre de la page projet (`projects/ApplyDialog.tsx`), ici même. Un visiteur passe par la
  connexion et revient avec `?apply={id}` : l'annonce est chargée (`GET /v1/openings/{id}`) et la fenêtre
  s'ouvre, si le rôle est encore ouvert. Selon qui regarde, la carte dit plutôt « Candidature envoyée », « Ton
  équipe », ou pour le porteur « Gérer les candidatures ».
- **Liste** (`openings/OpeningList.tsx`) : deux colonnes sur grand écran, douze annonces à la fois, comme la
  grille de la vitrine (filtres actifs, liste d'avant atténuée, cartes qui glissent). Au bout, en pointillés,
  l'annonce que l'équipe du visiteur n'a pas encore publiée. Sans résultat : le métier vide, effacer les filtres
  ou publier un rôle.
- Textes : l'espace de noms `openings` des traductions, téléchargé avec la page.

## Pied de page

`layout/Footer.tsx` : les liens (Explorer, Contribuer), les dix langues écrites chacune dans sa langue
(un clic change la langue du site), les réglages du visiteur (thème, avec la même ouverture en cercle que
la corde ; économie de données), un témoin de l'API (vraie requête, quand le pied de page arrive à
l'écran) et le retour en haut.

Au-dessus, la couture (`shared/HolographicSeparator.tsx`, d'après un séparateur d'un autre projet) : un
fil kente cousu à petits points qui se tire d'un bord à l'autre, une navette de lumière qui le parcourt,
un nœud à chaque bout. En bas à droite (à gauche en arabe), `layout/ScrollToTop.tsx` arrive après un
écran de lecture : son anneau se tisse au fil du défilement, il se tient au-dessus du dock sur mobile et
s'efface quand la dernière ligne du pied de page, qui a son propre « Haut de page », est à l'écran.

En signature, `layout/FooterLoom.tsx` : le nom de la plateforme, centré, n'est pas dessiné, c'est un creux
dans un kente. L'étoffe est tissée une fois sur un canvas (rayures de chaîne or, vert, rouge et fils sombres,
dense en bas, effilochée vers le haut), puis glisse en CSS sans être redessinée. Une lampe suit la
souris. Pas de liens vers des pages légales ou des réseaux sociaux tant qu'elles n'existent pas.

## Connexion et inscription

`layout/AuthLayout.tsx` : le formulaire d'un côté, sans navigation (logo, langue, thème). De l'autre, sur
grand écran, le métier à tisser (`auth/AuthLoom.tsx`) : un panneau de nuit où la chaîne attend, tendue,
et où une étoffe kente monte à mesure qu'on remplit le formulaire. Une navette de lumière court sur la
ligne de tissage pendant qu'elle monte. Le texte du panneau change avec la page ; dessous, la communauté
en chiffres (`GET /v1/stats`). Sur téléphone, une bande tissée suit le même avancement.

- L'étoffe : `auth/authLoomEngine.ts`, sur un canvas, rangée après rangée (rayures de chaîne, blocs de
  trame à motifs : losanges, chevrons, damiers) ; seules les rangées qui changent sont redessinées. Les
  formulaires disent où ils en sont dans `store/useAuthLoomStore.ts`. Elle ne monte jamais sous le texte.
- La session ouverte, l'étoffe s'achève et une étiquette cousue accueille le membre par son prénom, puis la
  page s'en va (`useLogin({ welcome })`, 1,5 s ; un instant avec les animations réduites).
- Champs (`auth/AuthField.tsx`) : libellé, icône, aide ou erreur reliées au champ, un fil kente qui se
  tisse dessous au focus. Les champs en caractères latins (e-mail, nom, mot de passe) vont de gauche à
  droite, même en arabe.
- Mot de passe : l'afficher pour se relire, alerte quand les majuscules sont verrouillées, et à
  l'inscription une jauge de solidité, règle par règle (seuls les 8 caractères sont exigés).
- Nom d'utilisateur : proposé à partir du nom complet (« Awa Diop » → awa_diop), nettoyé pendant la
  frappe, vérifié à la pause (`GET /v1/auth/username-availability`) ; s'il est pris ou réservé, des
  variantes libres se choisissent d'un clic. L'adresse du profil s'affiche dessous.
- GitHub, Google, GitLab (`auth/OAuthButtons.tsx`) : le backend ne les gère pas encore ; un clic dit que ça
  arrive et ramène au formulaire. Pour en brancher un : `ready: true` et l'adresse d'autorisation du
  backend dans `PROVIDERS`.
- Erreurs : identifiants refusés, le formulaire secoue la tête et le mot de passe est sélectionné ; e-mail
  déjà inscrit ou nom pris, sous le bon champ (le backend désigne le champ).
- `layout/LanguageSwitcher.tsx` (les dix langues, chacune écrite dans la sienne) et
  `layout/ThemeToggle.tsx` (clair ou sombre, la palette s'ouvre en cercle depuis le bouton) servent ici, et
  serviront ailleurs.

## Langues

10 langues : français (par défaut), English, العربية (de droite à gauche), Português, አማርኛ,
Hausa, Kiswahili, Wolof, Yorùbá, isiZulu. Le français est dans le bundle ; les autres langues sont
téléchargées seulement quand on les choisit. Les polices arabe et éthiopienne aussi.

- Texte : `const { t } = useTranslation(); t('nav.forum')`. Les clés sont typées depuis le français.
- Pluriels : `t('forum.replies', { count })` avec les clés `_one`, `_other`… (6 formes en arabe).
- Dates et nombres : `formatRelativeTime`, `formatDate`, `formatCount` (`src/utils/formatters.ts`),
  dans la langue de l'interface.
- Mise en page de droite à gauche : préférer les classes logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`,
  `end-`, `text-start`) et la variante `rtl:` quand il le faut.
- Changer de langue : `useLanguage().setLanguage('wo')`.
- Ajouter une langue : voir l'en-tête de `src/i18n/languages.ts`.

Les traductions en langues africaines sont un **premier jet à faire relire par des locuteurs natifs**,
le wolof en premier.

## Fluidité

- **Une page = un fichier** du build, téléchargé à la première visite (`router/pages.ts`).
- **Préchargement** : les pages de la navigation sont téléchargées quand le navigateur est au repos
  (`usePrefetchWhenIdle`). Les liens peuvent aussi les précharger au survol :
  `onPointerEnter={() => prefetch(item.preload)}` (`config/navigation.ts`, `lib/prefetch.ts`).
  Rien n'est préchargé en mode économie de données ni en 2G.
- **Coquille stable** : un membre connecté garde la même coquille d'une page à l'autre (`ShellLayout`).
- **Chargement** : `PageLoader` au premier affichage, `NavigationProgress` entre deux pages,
  `ListSkeleton` / `<Skeleton>` à reflet dans les blocs, `EmptyState` et `ErrorState` pour le reste.
- **Fondu entre pages** : `<Link viewTransition>` ou `navigate(to, { viewTransition: true })`.
- **Données** : TanStack Query met en cache (1 min) ; une erreur de mutation affiche un toast traduit.
- **Mode économie de données** (`useDataSaverStore`) : activé d'office si le navigateur le demande.
  Effets coupés, pas de préchargement ; les images lourdes doivent attendre (`LazyImage`).
- **Après un déploiement**, une page dont le fichier n'existe plus recharge le site une fois (`main.tsx`).
- **Polices** servies avec le site (aucune requête vers Google Fonts), découpées par alphabet.
- **Bibliothèques communes** (React, router, données, i18n) dans un fichier à part, gardé en cache
  d'un déploiement à l'autre (`vite.config.ts`).

## Composants 21st.dev

Ils s'installent avec la CLI shadcn, configurée dans `components.json` :

```bash
npx shadcn@latest add "https://21st.dev/r/<auteur>/<composant>"
```

Ils arrivent dans `src/components/ui/` et utilisent déjà la palette (`bg-background`, `text-primary`,
`dark:`…). On les utilise ensuite depuis nos composants (`components/<domaine>/`), sans les mélanger
aux coquilles. Après l'installation, vérifier :

- `next/link` → `Link` de `react-router-dom` ; `next/image` → `LazyImage` ou `<img loading="lazy">` ;
- `useTheme` de `next-themes` → `useTheme` de `@/hooks/useTheme` (même forme) ;
- `"use client"` : inutile ici, sans effet ;
- `cn` doit venir de `@/lib/utils` (configuré pour les classes du design) ;
- animations avec Motion (`motion/react`) : `MotionConfig` et `LazyMotion` sont déjà posés dans
  `providers/AppProviders.tsx`, avec les animations coupées comme en CSS. Préférer `m.div` à
  `motion.div` : le code des animations est alors téléchargé à part, après le premier affichage
  (`lib/motion.ts`). `motion.div` fonctionne aussi, mais embarque tout Motion dans la page ;
- lien animé : animer un `<a>` (`m.a` avec `useHref` et `useLinkClickHandler` de React Router, voir
  `layout/PublicNavbar.tsx`), pas `m.create(Link)` : `<Link>` change de ref à chaque rendu et Motion
  y perd le survol, le focus et l'appui ;
- composant lourd (3D, canvas, particules) : le charger avec `React.lazy` et le masquer en mode
  économie de données.

Les inspirations 21st.dev citées par le design, et les coquilles qui les attendent : bordure dégradée
animée (`shared/GradientBorder`), kanban avec carte soulevée (`workspace/KanbanBoard`, la démo de
l'accueil, `landing/bento/TeamCard.tsx`, montre le geste), diff de code avec fil de commentaires (`reviews/DiffViewer`),
skeleton à reflet (`feedback/ListSkeleton`).
