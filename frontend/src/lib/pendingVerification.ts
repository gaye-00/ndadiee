import type { PendingVerification } from '@/types/auth.types';

/**
 * Un code qui attend d'être saisi : l'adresse où il est parti, et quand un nouveau pourra être demandé. Gardé dans
 * l'onglet (sessionStorage) : la page du code survit à un rechargement, et l'adresse ne passe pas dans l'URL. Un pour
 * l'inscription (confirmer son adresse), un pour le mot de passe oublié.
 */
export interface StoredVerification {
  email: string;
  /** Horodatage (ms) à partir duquel un nouveau code peut être demandé */
  resendAt: number;
}

function codeStore(key: string) {
  return {
    remember(pending: PendingVerification): StoredVerification {
      const stored = { email: pending.email, resendAt: Date.now() + pending.resendAvailableInSeconds * 1000 };
      try {
        sessionStorage.setItem(key, JSON.stringify(stored));
      } catch {
        // Stockage bloqué : la page du code fonctionne quand même, jusqu'au prochain rechargement
      }
      return stored;
    },
    read(): StoredVerification | null {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as StoredVerification) : null;
      } catch {
        return null;
      }
    },
    forget() {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Rien à effacer
      }
    },
  };
}

/** L'inscription qui attend son code */
const verification = codeStore('ndadiee_pending_verification');
export const rememberPendingVerification = verification.remember;
export const readPendingVerification = verification.read;
export const forgetPendingVerification = verification.forget;

/** Le mot de passe oublié qui attend son code */
const reset = codeStore('ndadiee_pending_reset');
export const rememberPendingReset = reset.remember;
export const readPendingReset = reset.read;
export const forgetPendingReset = reset.forget;
