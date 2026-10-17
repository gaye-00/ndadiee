import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UpdateOptions {
  /** Remplace l'entrée de l'historique au lieu d'en ajouter une : la frappe dans un champ de recherche */
  replace?: boolean;
}

/**
 * Filtres d'une liste gardés dans l'URL (?tag=java&page=2) : la page se partage, survit à un
 * rechargement, et le bouton Précédent du navigateur revient au filtre d'avant.
 */
export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  // L'URL du moment, et de quoi la changer : `update` reste le même d'un rendu à l'autre
  const latest = useRef(searchParams);
  const setter = useRef(setSearchParams);

  useLayoutEffect(() => {
    latest.current = searchParams;
    setter.current = setSearchParams;
  });

  /**
   * Modifie des paramètres ; `null` retire le paramètre de l'URL. Part toujours de l'URL du moment : deux
   * changements rapprochés (une recherche qui attend la fin de la frappe, un filtre cliqué entre-temps) se
   * cumulent. La page ne remonte pas en haut.
   */
  const update = useCallback((changes: Record<string, string | null>, options?: UpdateOptions) => {
    const next = new URLSearchParams(latest.current);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    // Un second changement dans la foulée part de celui-ci, sans attendre la navigation
    latest.current = next;
    setter.current(next, { replace: options?.replace, preventScrollReset: true });
  }, []);

  const page = Number(searchParams.get('page') ?? 0);

  return {
    /** Tous les paramètres : un nouvel objet seulement quand l'URL change */
    params: searchParams,
    /** Valeur d'un paramètre, ou undefined s'il est absent */
    get: (key: string) => searchParams.get(key) ?? undefined,
    /** Numéro de page (à partir de 0) */
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    update,
  };
}
