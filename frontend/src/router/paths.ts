/** Toutes les URL de l'application, à un seul endroit. */
export const paths = {
  landing: '/',
  feed: '/feed',

  questions: '/questions',
  askQuestion: '/questions/ask',
  question: (slug: string) => `/questions/${slug}`,

  articles: '/articles',
  article: (slug: string) => `/articles/${slug}`,

  projects: '/projects',
  opportunities: '/opportunities',

  profile: (username: string) => `/u/${username}`,

  search: '/search',
  notifications: '/notifications',

  login: '/login',
  register: '/register',
} as const;
