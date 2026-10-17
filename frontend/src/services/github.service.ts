import axios from 'axios';
import type { ContributionDay } from '@/lib/contributions';

/**
 * Calendrier public des contributions d'un compte GitHub, sur la dernière année.
 *
 * Service public et open source « github-contributions-api » (Jonathan Gruber), qui lit le calendrier
 * affiché sur les profils GitHub ; seul le pseudo saisi lui est envoyé. Appelé avec axios seul, sans
 * l'instance `api` : les jetons de session ne partent jamais chez un tiers.
 * À remplacer par un endpoint du backend (API GraphQL de GitHub, avec un jeton) avant d'en dépendre
 * en production.
 */
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';

interface ContributionsResponse {
  total: Record<string, number>;
  contributions: Array<{ date: string; count: number; level: number }>;
}

/** Pseudo GitHub : lettres, chiffres, tirets isolés (ni au début ni à la fin), 39 caractères au plus */
export const GITHUB_LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export const githubService = {
  getContributions: (login: string, signal?: AbortSignal): Promise<ContributionDay[]> =>
    axios
      .get<ContributionsResponse>(`${CONTRIBUTIONS_API}/${encodeURIComponent(login)}`, {
        params: { y: 'last' },
        signal,
        timeout: 12_000,
      })
      .then((response) => response.data.contributions),

  /** Photo de profil, servie par GitHub */
  avatarUrl: (login: string, size = 64) => `https://github.com/${encodeURIComponent(login)}.png?size=${size}`,
};
