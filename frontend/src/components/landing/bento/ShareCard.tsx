import { ArrowRight, Check, MapPin, WifiOff, Zap } from 'lucide-react';
import { AnimatePresence, m, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StackLogo from '@/components/shared/StackLogo';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useStackLogos } from '@/hooks/useStackLogos';
import type { StackLogoId } from '@/lib/stackLogos';
import { cn } from '@/lib/utils';
import BentoCard from './BentoCard';

// Le devlog de lagos-transit (design 3D), de la plus récente à la plus ancienne
const VERSIONS = ['v07', 'v06', 'v05'] as const;
type Version = (typeof VERSIONS)[number];

const STACK: readonly { name: string; logo: StackLogoId }[] = [
  { name: 'Go', logo: 'go' },
  { name: 'GraphQL', logo: 'graphql' },
  { name: 'Redis', logo: 'redis' },
  { name: 'React Native', logo: 'react' },
];

// À la première apparition, l'appli rejoue son histoire : une version toutes les 1,3 s, jusqu'à la dernière
const STORY_STEP = 1300;

/**
 * 03 · Partager. La vitrine d'un projet : sa démo dans un téléphone, sa stack, et son devlog. Chaque
 * entrée du journal remet l'appli dans l'état de sa version : on remonte le temps du projet.
 */
export default function ShareCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const logos = useStackLogos();
  const [version, setVersion] = useState<Version>('v07');
  const [touched, setTouched] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { once: true, amount: 0.6 });

  // L'histoire, une fois : v0.5, v0.6, puis v0.7. Elle s'arrête dès qu'on choisit une version.
  useEffect(() => {
    if (!inView || reduced || touched) {
      return;
    }
    const steps = [...VERSIONS].reverse();
    const timers = steps.map((step, index) => window.setTimeout(() => setVersion(step), index * STORY_STEP));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduced, touched]);

  function pick(next: Version) {
    setTouched(true);
    setVersion(next);
  }

  return (
    <BentoCard
      step={3}
      accent="jade"
      eyebrow={t('features.share.eyebrow')}
      title={t('features.share.title')}
      text={t('features.share.text')}
      className={className}
    >
      <div ref={stage} className="flex flex-1 items-start gap-5">
        <Phone version={version} />

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-faint-foreground uppercase">{t('features.share.devlog')}</p>
          <ol className="relative mt-3">
            {/* Le fil du journal, qui relie les versions */}
            <m.span
              aria-hidden
              initial={reduced ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute start-[0.3125rem] top-2 bottom-2 w-px origin-top bg-linear-to-b from-jade/60 via-gold/40 to-coral/30"
            />
            {VERSIONS.map((item) => {
              const active = item === version;
              return (
                <li key={item} className="relative">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(item)}
                    className="group/version flex w-full gap-3 rounded-lg py-1.5 pe-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'relative mt-1 size-[0.6875rem] shrink-0 rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-300',
                        active
                          ? 'border-jade bg-jade shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-jade)_18%,transparent)]'
                          : 'border-border-strong bg-surface group-hover/version:border-jade/60',
                      )}
                    />
                    <span className="min-w-0">
                      {/* La date passe à la ligne d'un bloc quand la place manque (tablette, langues longues) */}
                      <span className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-[0.6875rem]">
                        <span className={cn('font-bold transition-colors', active ? 'text-jade' : 'text-soft-foreground')}>
                          {t(`features.share.versions.${item}.name`)}
                        </span>
                        <span className="text-faint-foreground">{t(`features.share.versions.${item}.when`)}</span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 block text-[0.8125rem] leading-snug transition-colors',
                          active ? 'text-foreground' : 'text-muted-foreground group-hover/version:text-soft-foreground',
                        )}
                      >
                        {t(`features.share.versions.${item}.text`)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <ul aria-label={t('features.share.stack')} className="mt-5 flex flex-wrap gap-1.5">
        {STACK.map((item) => (
          <li
            key={item.name}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-glass-border bg-surface/50 px-2.5 text-xs font-semibold text-soft-foreground saver:bg-surface"
          >
            {logos !== false && <StackLogo path={logos ? logos[item.logo] : undefined} className="size-3.5 text-faint-foreground" />}
            {item.name}
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}

/** Le téléphone de la démo, à l'écran de la version choisie. Illustration : le devlog dit la même chose. */
function Phone({ version }: { version: Version }) {
  return (
    // Plus étroit quand la carte partage sa rangée (tablette)
    <div aria-hidden className="bento-phone relative w-[8.5rem] shrink-0 rounded-[1.6rem] p-1.5 sm:w-[9.25rem] md:w-[8.5rem] lg:w-[9.25rem]">
      <div className="relative h-[15.5rem] overflow-hidden rounded-[1.2rem] bg-background">
        <span className="absolute start-1/2 top-1.5 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-foreground/15 rtl:translate-x-1/2" />
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div
            key={version}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex flex-col px-2.5 pt-5 pb-2.5 text-[0.625rem] leading-tight"
          >
            {version === 'v07' ? <DeparturesScreen /> : version === 'v06' ? <OfflineScreen /> : <RoutesScreen />}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** v0.7 : la page arrêt, servie par le cache en 120 ms (avant : 1,8 s). */
function DeparturesScreen() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-0.5 font-semibold">
          <MapPin className="size-2.5 shrink-0 text-coral" />
          <bdi className="truncate">CMS</bdi>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-jade/15 px-1.5 py-px font-mono text-[0.5625rem] font-bold text-jade">
          <Zap className="size-2.5" />
          <bdi>120 ms</bdi>
        </span>
      </div>
      <p className="mt-3 font-mono text-[0.5rem] tracking-[0.08em] text-faint-foreground uppercase">{t('features.share.app.next')}</p>
      <p className="mt-0.5 flex items-center gap-1 font-semibold text-soft-foreground">
        <ArrowRight className="size-2.5 rtl:-scale-x-100" />
        <bdi>Ikorodu</bdi>
      </p>
      <p className="mt-1 font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-gold">
        {t('features.share.app.minutes', { count: 4 })}
      </p>
      {/* Le chargement : la barre d'aujourd'hui part comme une flèche, l'ancienne se traîne derrière */}
      <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-foreground/8">
        <span className="bento-load-before absolute inset-y-0 start-0 w-full origin-left rounded-full bg-foreground/15 rtl:origin-right" />
        <span className="bento-load-now absolute inset-y-0 start-0 w-full origin-left rounded-full bg-jade rtl:origin-right" />
      </div>
      <p className="mt-1 font-mono text-[0.5rem] text-faint-foreground">{t('features.share.app.before')}</p>
      <ul className="mt-auto space-y-1.5 border-t border-border-subtle pt-2">
        {[
          ['Oshodi', 12],
          ['Ojota', 19],
          ['Fadeyi', 26],
        ].map(([stop, minutes]) => (
          <li key={stop} className="flex justify-between gap-1">
            <bdi className="truncate">{stop}</bdi>
            <span className="shrink-0 font-mono text-muted-foreground">{t('features.share.app.minutes', { count: Number(minutes) })}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** v0.6 : hors-ligne, les derniers arrêts consultés restent là. */
function OfflineScreen() {
  const { t } = useTranslation();
  return (
    <>
      <span className="inline-flex items-center gap-1 self-start rounded-full bg-gold/15 px-1.5 py-0.5 font-semibold text-gold">
        <WifiOff className="size-2.5" />
        {t('features.share.app.offline')}
      </span>
      <p className="mt-3 font-display text-[0.875rem] leading-tight font-bold">{t('features.share.app.kept', { count: 20 })}</p>
      <ul className="mt-2.5 space-y-1.5">
        {['CMS', 'Fadeyi', 'Ikorodu Rd', 'Obalende', 'Yaba'].map((stop) => (
          <li key={stop} className="flex items-center gap-1.5 rounded-md bg-foreground/5 px-1.5 py-1">
            <Check className="size-2.5 shrink-0 text-jade" strokeWidth={3} />
            <bdi className="truncate">{stop}</bdi>
          </li>
        ))}
      </ul>
    </>
  );
}

/** v0.5 : le premier flux GTFS, les lignes de danfo. */
function RoutesScreen() {
  const { t } = useTranslation();
  const routes = [
    ['Oshodi → CMS', 'bg-kente-gold'],
    ['Yaba → Obalende', 'bg-kente-coral'],
    ['Ikeja → Ojota', 'bg-kente-jade'],
    ['Mile 2 → Iyana Ipaja', 'bg-kente-gold'],
  ] as const;
  return (
    <>
      <p className="font-semibold">{t('features.share.app.routes')}</p>
      <ul className="mt-3 space-y-2">
        {routes.map(([route, tint]) => (
          <li key={route} className="flex items-center gap-1.5">
            <span className={cn('h-4 w-1 shrink-0 rounded-full', tint)} />
            <bdi dir="ltr" className="truncate">
              {route}
            </bdi>
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-center gap-1 border-t border-border-subtle pt-2 font-mono text-[0.5625rem] text-muted-foreground">
        <Check className="size-2.5 shrink-0 text-jade" strokeWidth={3} />
        {t('features.share.app.lines', { count: 140 })}
      </p>
    </>
  );
}
