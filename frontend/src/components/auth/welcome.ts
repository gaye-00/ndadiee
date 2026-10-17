import type { UserResponse } from '@/types/auth.types';

/**
 * Le temps de l'accueil, une fois la session ouverte : l'étoffe du métier s'achève et l'étiquette se
 * coud avant que la page ne s'en aille. Bref quand les animations sont coupées.
 */
export const WELCOME_PAUSE = { full: 1500, reduced: 350 } as const;

/** Le prénom, pour l'accueil : le premier mot du nom complet, sinon le nom d'utilisateur. */
export function firstNameOf(user: Pick<UserResponse, 'fullName' | 'username'>): string {
  return user.fullName.trim().split(/\s+/)[0] || user.username;
}
