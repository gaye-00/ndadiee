/** Toutes les URL de l'application, à un seul endroit. Libellés affichés : section `nav` des traductions. */
export const paths = {
  landing: '/',

  // ── Ouvert à tous ──
  /** Vitrine des projets */
  showcase: '/showcase',
  /** Page projet : présentation publique et rôles recherchés (design 3D) */
  project: (slug: string) => `/projects/${slug}`,
  /**
   * Les rôles recherchés d'un projet (« Voir les rôles »), ou l'un d'eux (le rôle d'une équipe de hackathon, le
   * retour de la connexion) : la page y descend, et le rôle s'éclaire
   */
  projectRoles: (slug: string, openingId?: number) => `/projects/${slug}#${openingId === undefined ? 'roles' : `role-${openingId}`}`,
  /** Annonces : rôles recherchés par les équipes */
  openings: '/openings',
  hackathons: '/hackathons',
  hackathon: (slug: string) => `/hackathons/${slug}`,
  /** Forum (anciennement « Questions ») */
  forum: '/forum',
  topic: (slug: string) => `/forum/${slug}`,
  profile: (username: string) => `/u/${username}`,
  search: '/search',
  /** Les résultats complets d'une recherche */
  searchFor: (query: string) => `/search?q=${encodeURIComponent(query)}`,

  // ── Membres connectés ──
  /** Atelier : tableau de bord du jour (design 3B) */
  dashboard: '/dashboard',
  myProjects: '/projects',
  newProject: '/projects/new',
  /** Espace d'équipe d'un projet (design 3E), un onglet par adresse */
  workspace: (slug: string) => `/projects/${slug}/workspace`,
  workspaceReviews: (slug: string) => `/projects/${slug}/workspace/reviews`,
  workspaceDevlog: (slug: string) => `/projects/${slug}/workspace/devlog`,
  workspaceRoles: (slug: string) => `/projects/${slug}/workspace/roles`,
  workspaceSettings: (slug: string) => `/projects/${slug}/workspace/settings`,
  /** Revue de code d'une pull request (design 3C) */
  review: (slug: string, number: number | string) => `/projects/${slug}/reviews/${number}`,
  reviews: '/reviews',
  newOpening: '/openings/new',
  /** Publier un rôle pour un projet, déjà choisi dans le formulaire */
  newOpeningFor: (slug: string) => `/openings/new?project=${encodeURIComponent(slug)}`,
  newTopic: '/forum/new',
  /** Modifier un sujet (son auteur, un modérateur) */
  editTopic: (slug: string) => `/forum/${slug}/edit`,
  /** Une réponse d'un sujet : la page y descend et l'éclaire */
  topicAnswer: (slug: string, answerId: number) => `/forum/${slug}#answer-${answerId}`,
  messages: '/messages',
  /** Une conversation privée, ouverte dans la messagerie */
  conversation: (id: number | string) => `/messages/${id}`,
  /** Écrire à un membre : ouvre (ou crée) la conversation avec lui (bouton « Envoyer un message » d'un profil) */
  messageTo: (username: string) => `/messages?to=${encodeURIComponent(username)}`,
  notifications: '/notifications',
  settings: '/settings',

  // ── Back-office : comptes d'administration seulement ──
  /** Vue d'ensemble : l'accueil d'un admin connecté */
  admin: '/admin',
  adminUsers: '/admin/users',
  adminContent: '/admin/content',
  adminJournal: '/admin/journal',

  // ── Compte ──
  login: '/login',
  register: '/register',
  /** Le code reçu par e-mail après l'inscription */
  verifyEmail: '/verify-email',
  // ── Textes légaux (liés depuis l'écran de connexion Google) ──
  privacy: '/privacy',
  terms: '/terms',

  /** Retour de GitHub ou Google avec leur code : l'adresse déclarée chez chaque fournisseur */
  oauthCallback: (provider: string) => `/auth/callback/${provider}`,
} as const;
