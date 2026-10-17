import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from 'react-router-dom';
import { site } from '@/config/site';
import type { RouteHandle } from '@/router/handle';

/** Titre de l'onglet : celui de la page affichée (handle de sa route), dans la langue de l'interface. */
export function useDocumentTitle(): void {
  const { t } = useTranslation();
  const matches = useMatches();
  const page = (matches.findLast((match) => match.handle)?.handle as RouteHandle | undefined)?.page;

  useEffect(() => {
    document.title =
      page && page !== 'landing' ? `${t(`pages.${page}`)} · ${site.name}` : `${site.name} — ${t('app.tagline')}`;
  }, [page, t]);
}
