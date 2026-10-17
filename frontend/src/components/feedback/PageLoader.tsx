import { useTranslation } from 'react-i18next';
import PulsatingDots from './PulsatingDots';
import { DEFAULT_LANGUAGE } from '@/i18n/languages';
import { alignWithPageClock } from '@/lib/pageClock';

/**
 * Affiché pendant le tout premier chargement d'une page (code et traductions) : les points kente au milieu
 * de l'écran, seulement après 0,3 s d'attente. Il prend la suite de celui de index.html, affiché avant le
 * JavaScript : même dessin, même horloge, on ne voit pas le passage de l'un à l'autre.
 */
export default function PageLoader() {
  // Sans attendre : il s'affiche justement pendant que les traductions arrivent. D'ici là, le texte est
  // celui du français, déjà dans le bundle, et les lecteurs d'écran le prononcent en français.
  const { t, ready } = useTranslation(undefined, { useSuspense: false });

  return (
    <div ref={alignWithPageClock} lang={ready ? undefined : DEFAULT_LANGUAGE} className="page-loader">
      <PulsatingDots label={t('states.loading')} />
    </div>
  );
}
