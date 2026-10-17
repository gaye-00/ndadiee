import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AvatarStack from '@/components/shared/AvatarStack';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { formatCount } from '@/utils/formatters';
import { createLoom, type Loom } from './authLoomEngine';

// Part du panneau tissée : un peu au départ, jusqu'à deux tiers quand le formulaire est rempli (sans
// jamais monter sous le texte du haut), tout à l'accueil
const CLOTH_START = 0.1;
const CLOTH_FORM = 0.64;
// L'écart gardé entre le texte du haut et l'étoffe, en pixels
const TEXT_ROOM = 40;
// À chaque image, l'étoffe fait ce bout du chemin qui reste : vite au début, en douceur à l'arrivée
const PACE = 0.085;

/**
 * Le métier à tisser des pages de connexion et d'inscription (grand écran) : un panneau de nuit où la
 * chaîne attend, tendue, et où l'étoffe kente monte à mesure que le formulaire se remplit
 * (store/useAuthLoomStore.ts). Une navette de lumière court sur la ligne de tissage pendant qu'elle monte.
 * À l'ouverture de la session, l'étoffe s'achève et une étiquette cousue accueille le membre par son nom.
 *
 * Décoratif : tout ce qu'il faut est dans le formulaire.
 */
export default function AuthLoom({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const progress = useAuthLoomStore((s) => s.progress);
  const welcome = useAuthLoomStore((s) => s.welcome);
  const { data: stats } = useCommunityStats();
  const { data: people } = useUsers({ size: 5 });
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loom = useRef<Loom | null>(null);
  const text = useRef<HTMLDivElement>(null);
  const cloth = useRef(0);
  // Part que l'étoffe peut prendre avant l'accueil : sous le texte du haut, selon la hauteur de l'écran
  const room = useRef(CLOTH_FORM);
  const register = pathname === paths.register;

  // Pose la part tissée : l'étoffe sur le canvas, la ligne de tissage et sa navette dans la page
  const lay = useCallback((fraction: number) => {
    const element = panel.current;
    const current = loom.current;
    if (!element || !current) {
      return;
    }
    current.weaveTo(fraction * current.capacity);
    element.style.setProperty('--fell', `${(1 - fraction) * 100}%`);
  }, []);

  // Le métier se monte une fois ; il se retend quand le panneau change de taille
  useEffect(() => {
    const element = panel.current;
    const surface = canvas.current;
    if (!element || !surface) {
      return;
    }
    loom.current = createLoom(surface);
    // Le panneau change de taille, ou le texte du haut (les chiffres arrivent) : l'étoffe se règle
    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = element;
      const block = text.current;
      if (block && height > 0) {
        room.current = Math.max(CLOTH_START, Math.min(CLOTH_FORM, 1 - (block.offsetTop + block.offsetHeight + TEXT_ROOM) / height));
      }
      loom.current?.resize(width, height);
      lay(cloth.current);
    });
    observer.observe(element);
    if (text.current) {
      observer.observe(text.current);
    }
    return () => observer.disconnect();
  }, [lay]);

  // L'étoffe va vers sa cible, image après image ; d'un coup avec les animations coupées. Tant qu'elle
  // avance, la navette court (data-weaving, posé sans passer par React : rien à rendre de nouveau).
  useEffect(() => {
    const element = panel.current;
    let frame = 0;
    function step() {
      const target = welcome ? 1 : CLOTH_START + (room.current - CLOTH_START) * progress;
      const gap = target - cloth.current;
      cloth.current = reduced || Math.abs(gap) < 0.002 ? target : cloth.current + gap * PACE;
      lay(cloth.current);
      const moving = cloth.current !== target;
      element?.toggleAttribute('data-weaving', moving && !reduced);
      if (moving) {
        frame = requestAnimationFrame(step);
      }
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [progress, welcome, reduced, lay]);

  return (
    <aside
      ref={panel}
      aria-hidden
      className={cn('auth-loom sticky top-0 h-dvh overflow-hidden border-s border-kente-gold/12 bg-kente-night text-kente-paper', className)}
    >
      <canvas ref={canvas} className="absolute inset-0 size-full" />

      {/* La ligne de tissage, et la navette qui la parcourt */}
      <div className="auth-fell pointer-events-none absolute inset-x-0 h-0">
        <span className="auth-fell-line absolute inset-x-0 -top-px h-0.5" />
        <span className="absolute inset-x-6 -top-1.5">
          <span className="auth-shuttle absolute start-0 top-0 h-3 w-12 rounded-full" />
        </span>
      </div>

      {/* Le mot de l'atelier, en haut, sur la chaîne */}
      <div className="auth-loom-scrim absolute inset-x-0 top-0 px-12 pt-14 pb-24 xl:px-16 xl:pt-16">
        <div ref={text}>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={register ? 'register' : 'login'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md"
            >
              <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-kente-gold uppercase">{t('auth.loom.eyebrow')}</p>
              <p className="mt-4 font-display text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance xl:text-5xl">
                {register ? t('auth.loom.registerTitle') : t('auth.loom.loginTitle')}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-kente-paper/70">
                {register ? t('auth.loom.registerText') : t('auth.loom.loginText')}
              </p>
            </m.div>
          </AnimatePresence>

          {stats && (
            <div className="mt-8 flex items-center gap-3.5">
              {people && people.content.length > 0 && (
                <AvatarStack users={people.content} max={5} ringClassName="ring-kente-night" />
              )}
              <p className="text-sm text-kente-paper/75">
                <span className="font-semibold text-kente-paper">{formatCount(stats.developers)}</span>{' '}
                {t('cta.stats.developers', { count: stats.developers })} ·{' '}
                <span className="font-semibold text-kente-paper">{formatCount(stats.countries)}</span>{' '}
                {t('cta.stats.countries', { count: stats.countries })} ·{' '}
                <span className="font-semibold text-kente-paper">{formatCount(stats.projects)}</span>{' '}
                {t('cta.stats.projects', { count: stats.projects })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* L'accueil : une étiquette cousue sur l'étoffe achevée */}
      <AnimatePresence>
        {welcome && (
          <m.div
            key="welcome"
            initial={{ opacity: 0, y: 40, rotate: -9, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: reduced ? 0 : 0.35 }}
            className="cta-label absolute start-1/2 top-[56%] w-[min(22rem,80%)] -translate-x-1/2 rounded-2xl bg-kente-paper px-8 py-7 text-kente-night rtl:translate-x-1/2"
          >
            <span className="block font-mono text-[0.6875rem] tracking-[0.12em] text-kente-night/60 uppercase">
              {t('auth.welcomeLabel')}
            </span>
            <span className="mt-2 block font-display text-4xl leading-tight font-extrabold tracking-[-0.03em] break-words" dir="auto">
              {welcome}
            </span>
          </m.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
