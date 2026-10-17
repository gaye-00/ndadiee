import { ArrowRight, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AvatarStack from '@/components/shared/AvatarStack';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles, type RoleDefinition, type TeamRoleId } from '@/config/roles';
import { useMarquee } from '@/hooks/useMarquee';
import { useOpeningRoleSummary } from '@/hooks/useOpenings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useStackLogos } from '@/hooks/useStackLogos';
import { currentLanguage } from '@/i18n';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { ProjectBrief } from '@/types/project.types';
import type { UserSummary } from '@/types/user.types';
import { storage } from '@/utils/storage';

// Vitesse de croisière (px/s) : un rôle passe en une dizaine de secondes
const SPEED = 34;
// Motifs qui se tissent quand la bande apparaît : ceux qu'on voit à ce moment-là
const WOVEN_ON_ENTRY = 5;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Bande des rôles recherchés, sous l'accroche (design 3A) : une bande de kente qui sort du métier.
 * Les dégradés des fils sont posés par la page (<WovenThreads />).
 *
 * Sur une bande de kente, la chaîne court tout du long en rayures de couleur ; par endroits, le
 * tisserand la couvre d'un bloc de trame où flotte un motif. Ici, chaque bloc est un rôle : son motif
 * tissé (config/roles.ts), son nom, les outils du métier. Quand des projets cherchent ce rôle (API),
 * les avatars de leurs porteurs s'y ajoutent.
 *
 * La bande défile, ralentit sous la souris, se tire et se lance (hooks/useMarquee.ts). Un bouton la
 * met en pause (choix gardé). Animations réduites ou économie de données : elle reste immobile et se
 * fait défiler à la main.
 */
export default function RolesMarquee() {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(() => storage.getRolesPaused());
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLUListElement>(null);
  const rtl = i18n.dir() === 'rtl';

  useMarquee(viewport, track, copy, { speed: SPEED, paused, disabled: reduced, rtl });
  const weave = useWeaveOnEntry(viewport, !reduced);

  // Projets qui recrutent, rôle par rôle (annonces du backend)
  const { data } = useOpeningRoleSummary();
  const teams = useMemo(
    () => new Map((data ?? []).map((summary) => [summary.role.toLowerCase() as TeamRoleId, summary.projects])),
    [data],
  );
  const logos = useStackLogos();

  function togglePause() {
    setPaused(!paused);
    storage.setRolesPaused(!paused);
  }

  return (
    <section aria-labelledby="roles-title" className="pt-2 pb-16 lg:pb-24">

      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <h2 id="roles-title" className="eyebrow">
          {t('rolesBand.title')}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={paths.openings}
            viewTransition
            onPointerEnter={() => prefetch(pages.openings)}
            onFocus={() => prefetch(pages.openings)}
            className={cn('group/all hidden items-center gap-1.5 rounded-full text-sm font-semibold text-gold sm:inline-flex', focusRing)}
          >
            {t('rolesBand.all')}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover/all:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/all:-translate-x-0.5"
            />
          </Link>
          {!reduced && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={t(paused ? 'rolesBand.play' : 'rolesBand.pause')}
              title={t(paused ? 'rolesBand.play' : 'rolesBand.pause')}
              className={cn(
                'grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
                focusRing,
              )}
            >
              {paused ? <Play aria-hidden className="size-3.5 rtl:-scale-x-100" /> : <Pause aria-hidden className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div
        ref={viewport}
        data-weave={weave ?? undefined}
        data-draggable={reduced ? undefined : ''}
        className={cn(
          // relative : la bande est le repère de ce qu'elle contient en absolu (textes pour lecteurs
          // d'écran), et le rogne. Sans cela, immobile (économie de données), le dernier de ces textes se
          // plaçait sur la page, à 5 000 px du bord, et toute la page défilait de côté.
          'role-ribbon relative mt-4 h-24 border-y border-border-subtle lg:h-28',
          reduced ? 'overflow-x-auto overscroll-x-contain [scrollbar-width:thin]' : 'overflow-clip',
        )}
      >
        <div ref={track} className="flex h-full w-max">
          {/* Trois fois la même bande, celle du milieu seule active : on ne voit jamais où elle recommence */}
          {(reduced ? [1] : [0, 1, 2]).map((copyIndex) => (
            <RoleStrip
              key={copyIndex}
              ref={copyIndex === 1 ? copy : undefined}
              inert={copyIndex !== 1}
              teams={teams}
              logos={logos}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type Logos = ReturnType<typeof useStackLogos>;

interface RoleStripProps {
  ref?: Ref<HTMLUListElement>;
  inert: boolean;
  teams: ReadonlyMap<TeamRoleId, ProjectBrief[]>;
  logos: Logos;
}

function RoleStrip({ ref, inert, teams, logos }: RoleStripProps) {
  return (
    <ul ref={ref} inert={inert} aria-hidden={inert || undefined} className="flex h-full shrink-0">
      {teamRoles.map((role, index) => (
        <li
          key={role.id}
          className="flex h-full"
          data-weave-in={!inert && index < WOVEN_ON_ENTRY ? '' : undefined}
          style={{ '--motif-delay': `${index * 140}ms` } as CSSProperties}
        >
          {/* La chaîne, entre deux blocs */}
          <span aria-hidden className="role-warp h-full w-9 shrink-0 lg:w-11" />
          <RoleBlock role={role} projects={teams.get(role.id)} logos={logos} />
        </li>
      ))}
    </ul>
  );
}

function RoleBlock({ role, projects = [], logos }: { role: RoleDefinition; projects?: ProjectBrief[]; logos: Logos }) {
  const { t } = useTranslation();
  const owners = uniqueOwners(projects);

  return (
    <Link
      to={`${paths.openings}?role=${role.id}`}
      viewTransition
      draggable={false}
      onPointerEnter={() => prefetch(pages.openings)}
      onFocus={() => prefetch(pages.openings)}
      className="role-weft group/role flex h-full shrink-0 items-center gap-4 ps-5 pe-7 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset lg:gap-5 lg:ps-7 lg:pe-9"
    >
      <WovenMotif motif={role.motif} colors={role.colors} className="h-12 w-auto lg:h-16" />

      <span className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 font-display text-[0.9375rem] leading-none font-bold tracking-tight text-foreground lg:text-base lg:leading-none">
          {t(`teamRoles.${role.id}`)}
          <ArrowRight
            aria-hidden
            className="size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition duration-300 ease-out-expo group-hover/role:translate-x-0 group-hover/role:opacity-100 rtl:translate-x-1 rtl:-scale-x-100 rtl:group-hover/role:translate-x-0"
          />
        </span>
        <span className="flex items-center gap-x-3 font-mono text-xs leading-none text-muted-foreground">
          {role.stack.map((item) => (
            <span key={item.name} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {item.logo && logos !== false && <StackLogo path={logos?.[item.logo]} className="text-soft-foreground" />}
              {item.name}
            </span>
          ))}
        </span>
      </span>

      {owners.length > 0 && (
        <>
          <AvatarStack users={owners} max={3} className="ms-1" />
          <span className="sr-only">
            {t('rolesBand.recruiting', {
              projects: new Intl.ListFormat(currentLanguage().intl as string[], { type: 'conjunction' }).format(
                projects.map((project) => project.name),
              ),
            })}
          </span>
        </>
      )}
    </Link>
  );
}

function uniqueOwners(projects: ProjectBrief[]): UserSummary[] {
  return [...new Map(projects.map((project) => [project.owner.id, project.owner])).values()];
}

/**
 * Les premiers motifs se tissent, passe après passe, la première fois que la bande entre à l'écran.
 * « wait » : motifs cachés en attendant ; « in » : tissage (styles/effects.css, « Motifs tissés »).
 */
function useWeaveOnEntry(target: RefObject<HTMLElement | null>, enabled: boolean): 'wait' | 'in' | null {
  const [state, setState] = useState<'wait' | 'in' | null>(enabled ? 'wait' : null);

  useEffect(() => {
    const element = target.current;
    if (!enabled || !element || state !== 'wait') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('in');
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, enabled, state]);

  return enabled ? state : null;
}
