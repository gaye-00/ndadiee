import { ArrowRight } from 'lucide-react';
import {
  animate,
  m,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AvatarStack from '@/components/shared/AvatarStack';
import GithubMark from '@/components/shared/GithubMark';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { useOpeningRoleSummary } from '@/hooks/useOpenings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useUsers } from '@/hooks/useUsers';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { formatCount } from '@/utils/formatters';

// Allers-retours de la navette pendant que la bannière se tisse
const PASSES = 9;
// Une scène fixée à l'écran demande un écran assez haut : en dessous, les deux cartes se suivent
const TALL_ENOUGH = '(min-height: 600px)';

const tallEnough = window.matchMedia(TALL_ENOUGH);
const subscribeHeight = (onChange: () => void) => {
  tallEnough.addEventListener('change', onChange);
  return () => tallEnough.removeEventListener('change', onChange);
};

/**
 * Bannière finale de l'accueil (design 3A : « Ton prochain projet commence par une équipe. »),
 * racontée au défilement, en trois temps, sur une scène fixée à l'écran :
 *
 * 1. « Un fil seul ne fait pas un pagne. » Un fil d'or traverse la première carte, avec la communauté
 *    en chiffres (API).
 * 2. Les fils de chaîne se tendent derrière elle, un à un.
 * 3. La bannière kente monte en se tissant : elle sort d'une ligne de tissage où une navette de lumière
 *    fait l'aller-retour au rythme du défilement, et reste posée sur le métier, ses fils dessous.
 *
 * Animations réduites, économie de données ou écran trop bas : les deux cartes se suivent, sans scène.
 */
export default function CtaBanner() {
  const reduced = useReducedMotion();
  const tall = useSyncExternalStore(subscribeHeight, () => tallEnough.matches);

  return reduced || !tall ? <StaticCta /> : <WovenCta />;
}

function StaticCta() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto flex max-w-page flex-col gap-6 px-4 pb-20 sm:px-6 lg:pb-28">
      <ThreadCard className="min-h-[30rem]" />
      <WovenBanner className="min-h-[30rem]" />
    </section>
  );
}

function WovenCta() {
  const { i18n } = useTranslation();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  // Le défilement, lissé : pas d'à-coups à la molette
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  // 1-2. La première carte : les fils de chaîne se tendent, puis elle recule sous la bannière
  const warp = useTransform(progress, [0.02, 0.3], [0, 1]);
  const backScale = useTransform(progress, [0.25, 0.9], [1, 0.92]);
  const backOpacity = useTransform(progress, [0.3, 0.9], [1, 0.22]);
  // 3. La bannière monte en se tissant ; la ligne de tissage et la navette ne vivent que le temps du tissage
  const rise = useTransform(progress, [0.25, 0.9], ['100%', '0%']);
  const weaving = useTransform(progress, [0.22, 0.3, 0.86, 0.93], [0, 1, 1, 0]);
  const loom = useTransform(progress, [0.18, 0.3], [0, 1]);
  // L'étiquette se coud sur l'étoffe quand le tissage s'achève
  const labelOpacity = useTransform(progress, [0.8, 0.92], [0, 1]);
  const labelRotate = useTransform(progress, [0.8, 0.95], [-14, -3]);
  const labelY = useTransform(progress, [0.8, 0.95], [28, 0]);
  const sign = i18n.dir() === 'rtl' ? -1 : 1;
  const shuttle = useTransform(progress, (p) => {
    const passes = Math.min(1, Math.max(0, (p - 0.25) / 0.65)) * PASSES;
    const phase = passes % 2;
    return `${sign * (phase <= 1 ? phase : 2 - phase) * 100}%`;
  });

  // Un lien de la bannière reçoit le focus au clavier : on va au bout de la scène, bannière tissée
  function revealBanner() {
    const element = section.current;
    if (!element || progress.get() > 0.9) {
      return;
    }
    const end = element.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    window.scrollTo({ top: end, behavior: 'smooth' });
  }

  return (
    <section ref={section} aria-labelledby="cta-title" className="relative h-[210svh]">
      {/* overflow-clip et non hidden : un cadre qui ne défile pas, le focus ne peut pas le décaler */}
      <div className="sticky top-0 h-svh overflow-clip">
        <div className="mx-auto flex h-full max-w-page flex-col px-4 pt-18 pb-5 sm:px-6 lg:pt-24 lg:pb-8">
          <div className="relative flex-1">
            {/* 1-2. Un fil, puis la chaîne */}
            <m.div style={{ scale: backScale, opacity: backOpacity }} className="absolute inset-0 origin-top">
              <ThreadCard warp={warp} className="h-full" />
            </m.div>

            {/* 3. Le métier : les fils de chaîne en attente, sous la ligne de tissage */}
            <m.div aria-hidden style={{ opacity: loom }} className="absolute inset-x-0 bottom-0 h-14">
              <span className="cta-warp-threads absolute inset-x-6 top-0 bottom-3" />
              <span className="cta-beam absolute inset-x-2 bottom-0 h-3 rounded-full" />
            </m.div>

            {/* La bannière sort de la ligne de tissage, qui est le bord bas de ce cadre */}
            <div className="absolute inset-x-0 top-0 bottom-14 overflow-clip rounded-[1.75rem]">
              <m.div style={{ y: rise }} className="absolute inset-0" onFocusCapture={revealBanner}>
                <WovenBanner className="h-full" label={{ opacity: labelOpacity, rotate: labelRotate, y: labelY }} />
              </m.div>
            </div>

            {/* La ligne de tissage et sa navette */}
            <m.div aria-hidden style={{ opacity: weaving }} className="pointer-events-none absolute inset-x-0 bottom-14 h-0">
              <span className="cta-fell absolute inset-x-0 -top-px h-0.5" />
              <span className="absolute inset-x-0 end-8 -top-1">
                <m.span style={{ x: shuttle }} className="absolute inset-0">
                  <span className="cta-shuttle absolute start-0 top-0 h-2 w-8 rounded-full" />
                </m.span>
              </span>
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * « Un fil seul ne fait pas un pagne. » La communauté en chiffres, un fil d'or qui traverse la carte,
 * et derrière, les fils de chaîne qui se tendent un à un (warp : de 0 à 1, au défilement).
 */
function ThreadCard({ warp, className }: { warp?: MotionValue<number>; className?: string }) {
  const { t } = useTranslation();
  const { data: stats } = useCommunityStats();

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] border border-border bg-surface p-6 sm:p-10 lg:p-14',
        className,
      )}
    >
      <m.span aria-hidden className="cta-warp absolute inset-0" style={{ '--warp': warp ?? 1 } as CSSProperties} />

      <div className="relative">
        <p className="eyebrow">{t('cta.eyebrow')}</p>
        <p className="mt-4 max-w-3xl font-display text-h1 text-balance">{t('cta.threadTitle')}</p>
        <p className="mt-5 max-w-xl text-lead text-muted-foreground">{t('cta.threadText')}</p>
      </div>

      {/* Le fil seul, dans l'espace entre le texte et les chiffres, d'un bord à l'autre de la carte */}
      <div className="relative -mx-6 min-h-12 flex-1 sm:-mx-10 lg:-mx-14">
        <LoneThread />
      </div>

      {stats && (
        <dl className="relative grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          <Stat value={stats.developers} label={t('cta.stats.developers', { count: stats.developers })} />
          <Stat value={stats.countries} label={t('cta.stats.countries', { count: stats.countries })} />
          <Stat value={stats.projects} label={t('cta.stats.projects', { count: stats.projects })} />
          <Stat
            value={stats.openings}
            label={t('cta.stats.openings', { count: stats.openings })}
            note={t('cta.stats.seats', { count: stats.seats })}
          />
        </dl>
      )}
    </div>
  );
}

/** Un chiffre qui se compte à l'arrivée à l'écran. */
function Stat({ value, label, note }: { value: number; label: string; note?: string }) {
  const number = useRef<HTMLElement>(null);
  const inView = useInView(number, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = number.current;
    if (!element || !inView) {
      return;
    }
    if (reduced) {
      element.textContent = formatCount(value);
      return;
    }
    const counting = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (current) => (element.textContent = formatCount(Math.round(current))),
    });
    return () => counting.stop();
  }, [inView, value, reduced]);

  return (
    <div className="border-t border-border pt-4">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span ref={number} aria-hidden className="block font-display text-h1 tabular-nums">
          {reduced ? formatCount(value) : 0}
        </span>
        <span className="sr-only">{formatCount(value)}</span>
        <span aria-hidden className="mt-1.5 block text-sm text-muted-foreground">
          {label}
        </span>
        {note && <span className="mt-0.5 block font-mono text-xs text-jade">{note}</span>}
      </dd>
    </div>
  );
}

/** Le fil seul : il traverse la carte en ondulant, tiré d'un bord à l'autre à l'arrivée. */
function LoneThread() {
  return (
    <svg aria-hidden viewBox="0 0 1200 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-1/2 h-16 w-full -translate-y-1/2">
      <m.path
        d="M0 40 C 140 8, 280 72, 420 40 S 700 8, 840 40 S 1080 72, 1200 40"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.85 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/**
 * La bannière, en kente tissé : le dégradé de la maquette, ses rayures, et des fils ton sur ton.
 * Une lumière de soie suit la souris.
 */
interface LabelMotion {
  opacity: MotionValue<number> | number;
  rotate: MotionValue<number> | number;
  y: MotionValue<number> | number;
}

function WovenBanner({ className, label }: { className?: string; label?: LabelMotion }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: people } = useUsers({ size: 6 });
  const cloth = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function shine(event: PointerEvent<HTMLDivElement>) {
    const element = cloth.current;
    if (event.pointerType !== 'mouse' || !element) {
      return;
    }
    const box = element.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty('--sheen-x', `${x}px`);
      element.style.setProperty('--sheen-y', `${y}px`);
    });
  }

  const primary = isAuthenticated
    ? { to: paths.newProject, preload: pages.newProject, label: t('actions.publishProject'), github: false }
    : { to: paths.register, preload: pages.register, label: t('actions.joinWithGithub'), github: true };
  const secondary = isAuthenticated
    ? { to: paths.dashboard, preload: pages.dashboard, label: t('cta.openWorkshop') }
    : { to: paths.showcase, preload: pages.showcase, label: t('cta.seeShowcase') };

  return (
    <div
      ref={cloth}
      onPointerMove={shine}
      className={cn(
        'cta-cloth relative flex flex-col justify-center overflow-hidden rounded-[1.75rem] p-6 text-kente-night sm:p-10 lg:p-16',
        className,
      )}
    >
      <span aria-hidden className="cta-cloth-sheen pointer-events-none absolute inset-0" />

      <div className="relative max-w-4xl lg:max-w-[calc(100%-22rem)] xl:max-w-[calc(100%-24rem)]">
        <h2
          id="cta-title"
          className="font-display text-[clamp(2.25rem,1.3rem+3.8vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance"
        >
          {t('cta.title')}
        </h2>
        <p className="mt-5 max-w-xl text-lead text-kente-night/75">{t('cta.text')}</p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to={primary.to}
            viewTransition
            onPointerEnter={() => prefetch(primary.preload)}
            onFocus={() => prefetch(primary.preload)}
            className="group/cta inline-flex h-14 items-center justify-center gap-3 rounded-full bg-kente-night ps-7 pe-6 text-base font-bold text-kente-paper shadow-[0_18px_40px_-18px_var(--kente-night)] transition-[scale,box-shadow] duration-300 outline-none hover:shadow-[0_22px_50px_-16px_var(--kente-night)] focus-visible:ring-2 focus-visible:ring-kente-night focus-visible:ring-offset-2 focus-visible:ring-offset-kente-gold active:scale-[0.98]"
          >
            {primary.github && <GithubMark className="size-5" />}
            {primary.label}
            <ArrowRight
              aria-hidden
              className="size-5 text-kente-gold transition-transform duration-300 group-hover/cta:translate-x-1 rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-1"
            />
          </Link>
          <Link
            to={secondary.to}
            viewTransition
            onPointerEnter={() => prefetch(secondary.preload)}
            onFocus={() => prefetch(secondary.preload)}
            className="inline-flex h-14 items-center justify-center rounded-full border-2 border-kente-night/80 px-7 text-base font-bold transition-colors duration-300 outline-none hover:bg-kente-night/10 focus-visible:ring-2 focus-visible:ring-kente-night"
          >
            {secondary.label}
          </Link>
        </div>

        {people && people.content.length > 0 && (
          <div className="mt-10 flex items-center gap-3">
            <AvatarStack users={people.content} max={6} size="md" ringClassName="ring-kente-night/85" />
            <span className="text-sm font-semibold text-kente-night/80">{t('cta.alreadyWeaving')}</span>
          </div>
        )}
      </div>

      <SeatsLabel motion={label ?? { opacity: 1, rotate: -3, y: 0 }} />
    </div>
  );
}

/**
 * L'étiquette cousue sur l'étoffe, comme celle d'un vêtement : les places à prendre (API), les motifs
 * des rôles les plus demandés, et le chemin vers les annonces. Grand écran seulement.
 */
function SeatsLabel({ motion }: { motion: LabelMotion }) {
  const { t } = useTranslation();
  const { data: stats } = useCommunityStats();
  const { data: summary } = useOpeningRoleSummary();
  if (!stats || stats.seats === 0) {
    return null;
  }
  const roles = [...(summary ?? [])]
    .sort((a, b) => b.seats - a.seats)
    .slice(0, 3)
    .map((entry) => roleOf(entry.role))
    .filter((role) => role !== undefined);

  return (
    <m.div
      style={{ opacity: motion.opacity, rotate: motion.rotate, y: motion.y }}
      className="absolute end-10 top-1/2 hidden w-72 -translate-y-1/2 lg:block xl:end-16"
    >
      <Link
        to={paths.openings}
        viewTransition
        onPointerEnter={() => prefetch(pages.openings)}
        onFocus={() => prefetch(pages.openings)}
        className="cta-label group/label block rounded-2xl bg-kente-paper p-7 text-kente-night transition-[translate,box-shadow] duration-500 ease-out-expo outline-none hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-kente-night focus-visible:ring-offset-2 focus-visible:ring-offset-kente-coral"
      >
        <span className="block font-mono text-[0.6875rem] tracking-[0.08em] text-kente-night/60 uppercase [&:lang(ar)]:tracking-normal">
          {t('cta.label.title')}
        </span>
        <span className="mt-2 block font-display text-[4.75rem] leading-[0.9] font-extrabold tracking-[-0.04em] tabular-nums">
          {formatCount(stats.seats)}
        </span>
        <span className="mt-2 block text-sm text-kente-night/75">{t('cta.label.inProjects', { count: stats.projects })}</span>
        {roles.length > 0 && (
          <span aria-hidden className="mt-5 flex items-center gap-3">
            {roles.map((role) => (
              <WovenMotif key={role.id} motif={role.motif} colors={role.colors} className="h-9 w-auto" />
            ))}
          </span>
        )}
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold">
          {t('cta.label.action')}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-300 group-hover/label:translate-x-1 rtl:-scale-x-100 rtl:group-hover/label:-translate-x-1"
          />
        </span>
      </Link>
    </m.div>
  );
}
