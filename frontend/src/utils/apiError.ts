import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import i18n from '@/i18n';

/** Corps d'erreur renvoyé par le GlobalExceptionHandler du backend (ErrorResponse.java). */
export interface ApiErrorBody {
  status: number;
  errorCode?: string;
  message?: string;
  /** Champ en erreur → message, uniquement pour errorCode = VALIDATION_ERROR */
  validationErrors?: Record<string, string>;
  /** Précisions propres à l'erreur : `reason`, le motif d'une suspension (ACCOUNT_BLOCKED) */
  details?: Record<string, string>;
  timestamp?: string;
}

/** Extrait le corps d'erreur structuré d'une erreur axios, sinon null. */
export function getApiError(err: unknown): ApiErrorBody | null {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiErrorBody | undefined) ?? null;
  }
  return null;
}

/** Message à afficher à l'utilisateur pour une erreur d'appel API. */
export function getApiErrorMessage(err: unknown, fallback?: string): string {
  // Pas de réponse du tout : serveur arrêté, coupure réseau, CORS
  if (axios.isAxiosError(err) && !err.response) {
    return i18n.t('errors.network');
  }
  return getApiError(err)?.message ?? fallback ?? i18n.t('errors.generic');
}

/**
 * Reporte les erreurs de validation du backend sur les champs du formulaire.
 *
 * @returns true si au moins une erreur a été placée sur un champ
 */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  const validationErrors = getApiError(err)?.validationErrors;
  if (!validationErrors) {
    return false;
  }
  Object.entries(validationErrors).forEach(([field, message]) => {
    // "tags[0]" → "tags" : le backend peut désigner un élément de liste
    setError(field.replace(/\[\d+\].*$/, '') as Path<T>, { type: 'server', message });
  });
  return true;
}
