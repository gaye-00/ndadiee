import type { PendingVerification } from '@/types/auth.types';

/**
 * L'inscription qui attend son code : l'adresse où il est parti, et quand un nouveau pourra être demandé. Gardée dans
 * l'onglet (sessionStorage) : la page du code survit à un rechargement, et l'adresse ne passe pas dans l'URL.
 */
const STORAGE_KEY = 'ndadiee_pending_verification';

export interface StoredVerification {
  email: string;
  /** Horodatage (ms) à partir duquel un nouveau code peut être demandé */
  resendAt: number;
}

export function rememberPendingVerification(pending: PendingVerification): StoredVerification {
  const stored = { email: pending.email, resendAt: Date.now() + pending.resendAvailableInSeconds * 1000 };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Stockage bloqué : la page du code fonctionne quand même, jusqu'au prochain rechargement
  }
  return stored;
}

export function readPendingVerification(): StoredVerification | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredVerification) : null;
  } catch {
    return null;
  }
}

export function forgetPendingVerification() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à effacer
  }
}
