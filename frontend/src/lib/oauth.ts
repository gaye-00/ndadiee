import type { Location } from 'react-router-dom';
import { paths } from '@/router/paths';
import { authService } from '@/services/auth.service';
import type { OAuthProviderId } from '@/types/auth.types';

/**
 * Connexion avec GitHub ou Google (OAuth 2, code d'autorisation avec PKCE). Avant de partir chez le fournisseur,
 * le navigateur tire un état et un vérificateur et les garde dans l'onglet (sessionStorage) : au retour, l'état
 * prouve que c'est bien cet onglet qui est parti, et seul le vérificateur permet d'échanger le code. Le serveur ne
 * reçoit au départ que l'empreinte du vérificateur.
 */

export const OAUTH_PROVIDERS: Record<OAuthProviderId, string> = { github: 'GitHub', google: 'Google' };

const STORAGE_KEY = 'ndadiee_oauth';
// Un aller-retour chez le fournisseur prend quelques secondes ; au-delà, l'état est périmé
const MAX_AGE = 10 * 60 * 1000;

export interface PendingOAuth {
  provider: OAuthProviderId;
  state: string;
  verifier: string;
  /** La page d'où l'on est parti (connexion ou inscription) : on y revient si la connexion échoue */
  origin: string;
  /** La page réservée que l'on voulait atteindre (posée par ProtectedRoute), atteinte une fois connecté */
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>;
  at: number;
}

/** Pourquoi la connexion n'a pas abouti : la page de connexion l'explique (OAuthButtons) */
export interface OAuthFailure {
  provider: string;
  /** Le code d'erreur de l'API (OAUTH_EMAIL_REQUIRED…), ou OAUTH_CANCELLED quand le membre a refusé chez le fournisseur */
  code: string;
  /** Le motif d'une suspension (ACCOUNT_BLOCKED) */
  reason?: string;
}

export function isOAuthProvider(value: string | undefined): value is OAuthProviderId {
  return value === 'github' || value === 'google';
}

/** L'adresse de retour déclarée chez le fournisseur : celle de ce site */
export function callbackUrl(provider: OAuthProviderId) {
  return `${window.location.origin}${paths.oauthCallback(provider)}`;
}

function base64url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 32 octets aléatoires : 43 caractères, la longueur minimale d'un vérificateur PKCE
function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeOf(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/**
 * Part chez le fournisseur. La promesse ne se tient jamais en cas de succès : la page s'en va.
 *
 * @throws l'adresse du fournisseur n'a pas pu être obtenue (fournisseur indisponible, réseau)
 */
export async function beginOAuth(provider: OAuthProviderId, origin: string, from?: PendingOAuth['from']): Promise<void> {
  const state = randomToken();
  const verifier = randomToken();
  const authorizationUrl = await authService.oauthAuthorization(provider, {
    redirectUri: callbackUrl(provider),
    state,
    codeChallenge: await challengeOf(verifier),
  });
  const pending: PendingOAuth = { provider, state, verifier, origin, from, at: Date.now() };
  // Sans stockage (navigation privée stricte), le retour ne pourrait pas être vérifié : on ne part pas
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  window.location.assign(authorizationUrl);
}

/**
 * Au retour : l'aller-retour en cours, s'il correspond à ce fournisseur et à cet état, et n'a pas expiré. Il est
 * effacé dans tous les cas : un code ne s'échange qu'une fois.
 */
export function takePendingOAuth(provider: string | undefined, state: string | null): PendingOAuth | null {
  let pending: PendingOAuth | null = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    pending = raw ? (JSON.parse(raw) as PendingOAuth) : null;
  } catch {
    return null;
  }
  if (!pending || pending.provider !== provider || !state || pending.state !== state || Date.now() - pending.at > MAX_AGE) {
    return null;
  }
  return pending;
}

/** Ce qui est resté de l'aller-retour, même périmé : la page d'où l'on est parti, pour y revenir */
export function oauthOrigin(pending: PendingOAuth | null) {
  return pending?.origin === paths.register ? paths.register : paths.login;
}
