import { useSearchParams } from 'react-router-dom';

/** Les onglets de la page d'une revue : les fichiers modifiés (par défaut), la conversation */
export type ReviewPageTab = 'files' | 'conversation';

/** L'onglet ouvert, dans l'URL : /projects/paperweight/reviews/12?tab=conversation se partage. */
export function useReviewPageTab(): ReviewPageTab {
  const [params] = useSearchParams();
  return params.get('tab') === 'conversation' ? 'conversation' : 'files';
}

/** L'adresse d'un onglet (sans ancre) : la recherche de la page, sans l'onglet par défaut. */
export function reviewPageTabSearch(tab: ReviewPageTab, params: URLSearchParams): string {
  const next = new URLSearchParams(params);
  if (tab === 'files') {
    next.delete('tab');
  } else {
    next.set('tab', tab);
  }
  const search = next.toString();
  return search ? `?${search}` : '';
}
