import axios from 'axios';
import { api } from './api';
import type { ContributionDay } from '@/lib/contributions';
import type { ApiResponse } from '@/types/common.types';
import type { GithubRepository, GithubRepositorySummary } from '@/types/github.types';

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

  /**
   * Un dépôt public, lu par le backend (son jeton GitHub, son cache) pour préremplir un projet : description, site,
   * licence, technologies proposées, introduction du README.
   */
  getRepository: (owner: string, name: string, signal?: AbortSignal) =>
    api
      .get<ApiResponse<GithubRepository>>(`/v1/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
        signal,
        // Trois requêtes à GitHub derrière celle-ci
        timeout: 30_000,
      })
      .then((r) => r.data.data),

  /** Les dépôts récents du membre connecté, d'après le GitHub de son profil (vide s'il ne l'a pas renseigné) */
  getMyRepositories: () =>
    api.get<ApiResponse<GithubRepositorySummary[]>>('/v1/github/me/repositories', { timeout: 30_000 }).then((r) => r.data.data),
};

/** Nom de dépôt GitHub : lettres, chiffres, points, tirets et soulignés */
const REPOSITORY_NAME = /^[\w.-]{1,100}$/;

/**
 * Le dépôt désigné par une saisie libre : « owner/name », une adresse github.com (avec ou sans https://, une page
 * du dépôt, « .git »), ou une adresse SSH (git@github.com:owner/name.git). null si ce n'est pas un dépôt GitHub.
 */
export function parseGithubRepository(input: string): { owner: string; name: string } | null {
  const text = input.trim().replace(/^git\+/, '');
  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(text);
  const web = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i.exec(text);
  const short = /^([^/\s:]+)\/([^/\s]+)$/.exec(text);
  // « gitlab.com/owner » ressemble à « owner/name » : le compte, avec son point, n'est pas un compte GitHub
  const match = ssh ?? web ?? short;
  if (!match) {
    return null;
  }
  const owner = match[1];
  const name = match[2].replace(/\.git$/i, '');
  return GITHUB_LOGIN.test(owner) && REPOSITORY_NAME.test(name) && name !== '.' && name !== '..' ? { owner, name } : null;
}
