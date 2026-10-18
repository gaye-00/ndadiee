import type { useTranslation } from 'react-i18next';

/** « 1er prix », « 2e prix »… : un ordinal, selon les règles de la langue de l'interface (« 2nd prize »). */
export function rankLabel(t: ReturnType<typeof useTranslation<'hackathons'>>['t'], rank: number): string {
  return t('past.place', { count: rank, ordinal: true });
}
