/** Toutes les URL de l'application, à un seul endroit. Libellés affichés : section `nav` des traductions. */
export const paths = {
  landing: '/',

  // ── Ouvert à tous ──
  /** Vitrine des projets */
  showcase: '/showcase',
  /** Page projet : présentation publique et rôles recherchés (design 3D) */
  project: (slug: string) => `/projects/${slug}`,
  /** Annonces : rôles recherchés par les équipes */
  openings: '/openings',
  hackathons: '/hackathons',
  hackathon: (slug: string) => `/hackathons/${slug}`,
  /** Forum (anciennement « Questions ») */
  forum: '/forum',
  topic: (slug: string) => `/forum/${slug}`,
  profile: (username: string) => `/u/${username}`,
  search: '/search',

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
  newTopic: '/forum/new',
  messages: '/messages',
  notifications: '/notifications',
  settings: '/settings',

  // ── Compte ──
  login: '/login',
  register: '/register',
} as const;
