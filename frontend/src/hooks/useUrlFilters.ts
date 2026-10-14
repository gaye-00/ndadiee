import { useSearchParams } from 'react-router-dom';

/**
 * Filtres d'une liste gardés dans l'URL (?tag=java&page=2) : la page se partage, survit à un
 * rechargement, et le bouton Précédent du navigateur revient au filtre d'avant.
 */
export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  /** Modifie des paramètres ; `null` retire le paramètre de l'URL. */
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next);
  };

  const page = Number(searchParams.get('page') ?? 0);

  return {
    /** Valeur d'un paramètre, ou undefined s'il est absent */
    get: (key: string) => searchParams.get(key) ?? undefined,
    /** Numéro de page (à partir de 0) */
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    update,
  };
}
