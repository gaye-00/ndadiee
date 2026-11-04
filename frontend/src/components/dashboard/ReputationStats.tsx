import { ArrowRight, Award } from 'lucide-react';
import { useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { formatCount } from '@/utils/formatters';

// Durée de la montée des compteurs
const COUNT_UP_MS = 900;

type StatKey = 'mergedPullRequests' | 'reviewsGiven' | 'projectsLed' | 'buildersWelcomed';

// Les quatre chiffres du design 3B (PR fusionnées, revues, projets menés, membres accueillis), chacun sur un fil
const STATS: ReadonlyArray<{ key: StatKey; thread: string }> = [
  { key: 'mergedPullRequests', thread: 'bg-kente-gold' },
  { key: 'reviewsGiven', thread: 'bg-kente-jade' },
  { key: 'projectsLed', thread: 'bg-kente-coral' },
  { key: 'buildersWelcomed', thread: 'bg-kente-gold' },
];

/**
 * « Ta réputation de bâtisseur » : PR fusionnées, revues de code rendues, projets menés, bâtisseur·ses accueilli·es
 * dans ses équipes ; sa réputation ; et dessous, ses avis, ses réponses acceptées au forum, les étoiles de ses projets.
 * Design 3B (« 312 PR fusionnées, 148 revues utiles, 4 projets menés, 12 mentoré·es »). Les chiffres montent quand la
 * carte arrive à l'écran.
 */
export default function ReputationStats() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const stats = useDashboard((dashboard) => dashboard.stats);
  const card = useRef<HTMLElement>(null);
  const seen = useInView(card, { once: true, margin: '0px 0px -40px 0px' });

  if (stats.isError) {
    return null;
  }

  return (
    <section ref={card} aria-labelledby="atelier-reputation-title" className="glass flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <h2 id="atelier-reputation-title" className="flex-1 font-sans text-[0.9375rem] font-bold">
          {t('stats.title')}
        </h2>
        {stats.data && (
          <span
            title={t('stats.reputation')}
            className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-gold tabular-nums"
          >
            <Award aria-hidden className="size-3" />
            <span className="sr-only">{t('stats.reputation')} :</span>
            <CountUp value={stats.data.reputation} active={seen} />
          </span>
        )}
      </div>

      {stats.isPending ? (
        <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-4">
          {STATS.map(({ key }) => (
            <span key={key} className="flex flex-col gap-2">
              <span className="h-6 w-10 rounded-md skeleton-shimmer" />
              <span className="h-2.5 w-20 rounded-full skeleton-shimmer" />
            </span>
          ))}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
          {STATS.map(({ key, thread }, index) => (
            <Stat key={key} label={t(`stats.${key}`, { count: stats.data[key] })} value={stats.data[key]} thread={thread} active={seen} index={index} />
          ))}
        </dl>
      )}

      {stats.data && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-subtle pt-3 font-mono text-[0.6875rem] text-muted-foreground">
          <span>{t('stats.feedbackGivenLine', { count: stats.data.feedbackGiven })}</span>
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <span>{t('stats.acceptedAnswersLine', { count: stats.data.acceptedAnswers })}</span>
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <span>{t('stats.stars', { count: stats.data.starsReceived, formatted: formatCount(stats.data.starsReceived) })}</span>
          {user && (
            <Link
              to={paths.profile(user.username)}
              viewTransition
              onPointerEnter={() => prefetch(pages.profile)}
              onFocus={() => prefetch(pages.profile)}
              className="group/profile ms-auto inline-flex items-center gap-1 rounded-md font-sans text-xs font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {t('stats.profile')}
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/profile:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/profile:-translate-x-0.5" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, thread, active, index }: { label: string; value: number; thread: string; active: boolean; index: number }) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* Le libellé, puis le chiffre ; à l'écran, le chiffre passe au-dessus */}
      <dt className="order-2 mt-1 flex items-center gap-1.5 font-mono text-xs leading-snug text-muted-foreground">
        <span aria-hidden className={cn('h-0.5 w-2.5 shrink-0 rounded-full', thread)} />
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className="order-1 font-display text-2xl leading-none font-bold text-foreground tabular-nums">
        <CountUp value={value} active={active} delay={index * 90} />
      </dd>
    </div>
  );
}

/**
 * Un nombre qui monte de 0 à sa valeur, une fois, quand `active` passe à vrai. Le texte lu par les lecteurs d'écran
 * est toujours la valeur finale ; sans animation, elle s'affiche d'emblée.
 */
function CountUp({ value, active, delay = 0 }: { value: number; active: boolean; delay?: number }) {
  const reduced = useReducedMotion();
  const [counted, setShown] = useState(0);
  // D'où repartir quand la valeur change (rafraîchissement de l'atelier) : la dernière affichée
  const from = useRef(0);

  useEffect(() => {
    if (reduced || !active) {
      return;
    }
    let frame = 0;
    const start = performance.now() + delay;
    const origin = from.current;
    const step = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - start) / COUNT_UP_MS));
      // Sortie expo : vite au début, posé à la fin
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      const current = Math.round(origin + (value - origin) * eased);
      from.current = current;
      setShown(current);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, value, delay, reduced]);

  // Sans animation, la valeur tout de suite
  const shown = reduced ? value : counted;

  return (
    <>
      <span aria-hidden>{formatCount(shown)}</span>
      <span className="sr-only">{formatCount(value)}</span>
    </>
  );
}
