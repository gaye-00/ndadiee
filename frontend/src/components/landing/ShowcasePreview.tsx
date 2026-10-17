import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import ProjectCard, { ProjectCardSkeleton } from '@/components/projects/ProjectCard';
import SectionHeading from '@/components/shared/SectionHeading';
import type { KenteThread } from '@/config/roles';
import { useAuth } from '@/hooks/useAuth';
import { SHOWCASE_FILTERS, useProjects } from '@/hooks/useProjects';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Project } from '@/types/project.types';
import { formatCount } from '@/utils/formatters';

// Une couleur par carte au survol, comme la maquette : vert, or, rouge, décalées d'une rangée à l'autre
// pour que les couleurs courent en diagonale, comme sur un tissage
const ACCENTS: readonly KenteThread[] = ['jade', 'gold', 'coral'];
const accentOf = (index: number) => ACCENTS[(index + Math.floor(index / 3)) % ACCENTS.length];

// Projets montrés : deux rangées de trois sur grand écran, deux de deux sur tablette (une carte demande
// 350 px), quatre à faire glisser sur téléphone, où chaque image pèse sur le forfait. Une seule requête,
// à la taille du grand écran.
const SHOWN = { phone: 4, tablet: 4, desktop: SHOWCASE_FILTERS.size } as const;
// Grand écran : trois colonnes ; tablette : deux ; téléphone : une rangée qui glisse
const IMAGE_SIZES = '(min-width: 1024px) 400px, (min-width: 640px) 46vw, 84vw';

interface Counts {
  phone: number;
  tablet: number;
  desktop: number;
}

/**
 * Combien de projets chaque écran montre, en rangées complètes : avec 4 ou 5 projets, le grand écran en
 * montre 3 (une rangée) plutôt que 3 et 1 qui resterait seul.
 */
function countsFor(total: number): Counts {
  const rows = (perRow: number, max: number) => {
    const count = Math.min(total, max);
    return count >= perRow ? count - (count % perRow) : count;
  };
  return { phone: Math.min(total, SHOWN.phone), tablet: rows(2, SHOWN.tablet), desktop: rows(3, SHOWN.desktop) };
}

// Les classes complètes, pour que Tailwind les trouve
function visibilityOf(index: number, counts: Counts): string {
  return cn(
    index < counts.phone ? 'block' : 'hidden',
    index < counts.tablet ? 'md:block' : 'md:hidden',
    index < counts.desktop ? 'lg:block' : 'lg:hidden',
  );
}

/**
 * Section « La vitrine » de l'accueil (design 3A) : les projets les plus étoilés, avec leur capture,
 * leur équipe et les rôles qu'ils recherchent ; lien vers toute la vitrine.
 *
 * Six projets en deux rangées sur grand écran, quatre en deux rangées sur tablette. Sur téléphone, quatre
 * cartes à faire glisser, puis une carte qui mène au reste de la vitrine ; un fil, dessous, montre où l'on
 * en est. Une seule requête : les images des cartes cachées ne sont jamais téléchargées.
 */
export default function ShowcasePreview() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data, isPending, isError, refetch } = useProjects(SHOWCASE_FILTERS);
  const projects = data?.content ?? [];
  const counts = countsFor(isPending ? SHOWN.desktop : projects.length);
  // Sur téléphone, ce qui reste à voir dans la vitrine après les quatre cartes
  const more = (data?.totalElements ?? 0) - counts.phone;

  return (
    <section aria-labelledby="showcase-title" className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:pb-24">
      <SectionHeading
        id="showcase-title"
        title={t('showcase.title')}
        action={{ to: paths.showcase, label: t('showcase.all'), preload: pages.showcase }}
      />

      <div className="mt-6" aria-busy={isPending}>
        {isPending ? (
          <CardRow label={t('showcase.loading')}>
            {Array.from({ length: SHOWN.desktop }, (_, index) => (
              <Slide key={index} className={visibilityOf(index, counts)}>
                <ProjectCardSkeleton />
              </Slide>
            ))}
          </CardRow>
        ) : isError ? (
          <ErrorState title={t('showcase.errorTitle')} description={t('showcase.errorText')} onRetry={() => void refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState
            title={t('showcase.emptyTitle')}
            description={t('showcase.emptyText')}
            action={{ to: isAuthenticated ? paths.newProject : paths.register, label: t('showcase.emptyAction') }}
          />
        ) : (
          <CardRow>
            {projects.map((project, index) => (
              <Slide key={project.id} className={visibilityOf(index, counts)}>
                <ProjectCard project={project} accent={accentOf(index)} imageSizes={IMAGE_SIZES} />
              </Slide>
            ))}
            {more > 0 && (
              <Slide className="md:hidden">
                <MoreCard count={more} next={projects.slice(counts.phone, counts.phone + 2)} />
              </Slide>
            )}
          </CardRow>
        )}
      </div>
    </section>
  );
}

/** Une place de la rangée : une carte sur téléphone (et presque la suivante), une case de la grille ailleurs. */
function Slide({ className, children }: { className?: string; children: ReactNode }) {
  return <li className={cn('w-[84%] shrink-0 snap-start sm:w-[46%] md:w-auto', className)}>{children}</li>;
}

/**
 * Deux colonnes sur tablette, trois sur grand écran ; sur téléphone, une rangée qui glisse, carte après
 * carte, avec un fil dessous : sa longueur dit la part qu'on voit, sa place où l'on en est.
 */
function CardRow({ children, label }: { children: ReactNode; label?: string }) {
  const row = useRef<HTMLUListElement>(null);
  const thread = useRef<HTMLSpanElement>(null);

  const measure = useCallback(() => {
    const list = row.current;
    const bar = thread.current;
    if (!list || !bar) {
      return;
    }
    const scrollable = list.scrollWidth - list.clientWidth;
    // En arabe, scrollLeft va de 0 à un nombre négatif : la rangée défile vers la gauche
    bar.style.setProperty('--seen', String(scrollable > 1 ? list.clientWidth / list.scrollWidth : 1));
    bar.style.setProperty('--progress', String(scrollable > 1 ? Math.min(1, Math.abs(list.scrollLeft) / scrollable) : 0));
    bar.hidden = scrollable <= 1;
  }, []);

  // Après chaque rendu : les cartes arrivent, leur nombre change avec la largeur
  useLayoutEffect(measure);

  useEffect(() => {
    const list = row.current;
    if (!list) {
      return;
    }
    list.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  return (
    <>
      <ul
        ref={row}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:p-0 lg:grid-cols-3"
      >
        {children}
      </ul>
      <span ref={thread} aria-hidden className="showcase-thread mx-auto mt-1 block h-[3px] w-24 overflow-hidden rounded-full md:hidden">
        <span className="block h-full rounded-full bg-kente" />
      </span>
    </>
  );
}

/**
 * La dernière place de la rangée, sur téléphone : combien d'autres projets attendent dans la vitrine,
 * les deux suivants en cartes empilées, et le chemin vers toute la vitrine.
 */
function MoreCard({ count, next }: { count: number; next: Project[] }) {
  const { t } = useTranslation();

  return (
    <Link
      to={paths.showcase}
      viewTransition
      onPointerEnter={() => prefetch(pages.showcase)}
      onFocus={() => prefetch(pages.showcase)}
      className="group/more relative isolate flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-dashed border-border-strong bg-glass p-5.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      {/* Les suivants, en cartes empilées : la vitrine continue derrière */}
      <span aria-hidden className="relative block h-36">
        {next.map((project, index) => (
          <span
            key={project.id}
            style={{ '--tilt': index === 0 ? '-6deg' : '5deg' } as CSSProperties}
            className={cn(
              'absolute start-2 end-8 top-4 flex h-24 flex-col justify-end rounded-xl border border-glass-border bg-surface p-3 shadow-float',
              'rotate-(--tilt) transition-transform duration-500 ease-out-expo group-hover/more:rotate-0',
              index === 1 && 'start-8 end-2 top-0 -z-10 opacity-80',
            )}
          >
            <span className="truncate font-display text-sm font-bold" dir="auto">
              {project.name}
            </span>
            {project.tagline && (
              <span className="mt-0.5 truncate text-xs text-muted-foreground" dir="auto">
                {project.tagline}
              </span>
            )}
          </span>
        ))}
      </span>

      <span className="mt-6 block font-display text-[3.25rem] leading-none font-extrabold tracking-[-0.04em] text-kente tabular-nums">
        +{formatCount(count)}
      </span>
      <span className="mt-2 block text-sm text-muted-foreground">{t('showcase.more', { count })}</span>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[0.9375rem] font-semibold text-gold">
        {t('showcase.all')}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform group-hover/more:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/more:-translate-x-0.5"
        />
      </span>
    </Link>
  );
}
