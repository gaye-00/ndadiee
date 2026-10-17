import { ArrowRight, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Chip from '@/components/shared/Chip';
import LazyImage from '@/components/shared/LazyImage';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf, teamRoles, type KenteThread, type RoleDefinition } from '@/config/roles';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Project } from '@/types/project.types';
import type { UserSummary } from '@/types/user.types';
import { formatCount } from '@/utils/formatters';

const ACCENTS: Record<KenteThread, string> = {
  gold: 'var(--gold)',
  coral: 'var(--coral)',
  jade: 'var(--jade)',
};

// Technologies reconnues : elles passent avant les sujets (« Java · Kotlin » plutôt que « API · Java »)
const TECHNOLOGIES = new Set(
  [
    ...teamRoles.flatMap((role) => role.stack.map((item) => item.name)),
    ...['Java', 'Kotlin', 'Go', 'Python', 'TypeScript', 'JavaScript', 'Dart', 'PHP', 'Rust', 'Swift', 'C#', 'Ruby', 'Elixir'],
    ...['Flutter', 'React Native', 'Angular', 'Next.js', 'Django', 'GraphQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase'],
  ].map((name) => name.toLowerCase()),
);

// Rôles cités sur la carte ; les autres sont comptés (« +1 »)
const ROLES_SHOWN = 2;
// Visages de l'équipe sur la carte
const TEAM_SHOWN = 3;

interface ProjectCardProps {
  project: Project;
  /** Couleur au survol : bordure et ombre (design : vert, or, rouge, une par carte) */
  accent?: KenteThread;
  /** Place de la couverture à l'écran, pour choisir sa taille (attribut sizes) */
  imageSizes?: string;
  className?: string;
}

/**
 * Carte de la vitrine : capture, nom, étoiles, description, stack, rôles recherchés, équipe. Design 3A.
 *
 * Au survol (ou au focus) : la carte se soulève et prend sa couleur, la photo s'approche, les issues
 * « premier pas » des rôles ouverts glissent sur l'image, et l'équipe s'écarte pour laisser voir une
 * place vide, en pointillés : celle du visiteur. Toute la carte mène au projet.
 */
export default function ProjectCard({ project, accent = 'jade', imageSizes, className }: ProjectCardProps) {
  const { t } = useTranslation();
  const href = paths.project(project.slug);
  const recruiting = project.openings.length > 0;
  const roles = uniqueRoles(project);
  const stack = stackOf(project);
  const summary = project.tagline ?? firstSentence(project.description);
  const preload = () => prefetch(pages.project);

  return (
    <article
      style={{ '--card-accent': ACCENTS[accent] } as CSSProperties}
      className={cn(
        'group/card glass relative flex h-full flex-col overflow-hidden rounded-2xl',
        'transition-[translate,border-color,box-shadow] duration-300 ease-out-expo',
        'hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)] hover:shadow-[0_24px_48px_-28px_var(--card-accent)]',
        'focus-within:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)]',
        className,
      )}
    >
      {/* ── Capture ── */}
      <div className="relative h-45 shrink-0 overflow-hidden">
        {project.coverUrl ? (
          <LazyImage
            src={project.coverUrl}
            thumbnail={project.coverThumbnailUrl}
            sizes={imageSizes}
            alt=""
            className="size-full"
            imageClassName="duration-700 ease-out-expo group-hover/card:scale-[1.04] group-focus-within/card:scale-[1.04]"
          />
        ) : (
          <span className="hatch grid size-full place-items-center font-mono text-xs text-faint-foreground">
            {t('showcase.noCover')}
          </span>
        )}

        {project.coverCredit && <PhotoCredit credit={project.coverCredit} source={project.coverSourceUrl} />}

        {recruiting && <FirstSteps project={project} />}
      </div>

      {/* ── Texte ── */}
      <div className="flex flex-1 flex-col gap-2.5 p-5.5">
        <div className="flex items-center gap-2.5">
          <h3 dir="auto" className="min-w-0 flex-1 truncate text-start font-mono text-[1.0625rem] leading-snug font-medium text-foreground">
            {/* Le lien couvre toute la carte */}
            <Link
              to={href}
              viewTransition
              onPointerEnter={preload}
              onFocus={preload}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
            >
              {project.name}
            </Link>
          </h3>
          <span className="shrink-0 font-mono text-xs text-gold">
            <span aria-hidden>★ {formatCount(project.starsCount)}</span>
            <span className="sr-only">{t('showcase.stars', { count: project.starsCount })}</span>
          </span>
        </div>

        {/* Écrit par le porteur, dans sa langue : le navigateur en déduit le sens d'écriture */}
        {summary && (
          <p dir="auto" className="line-clamp-2 text-start text-sm leading-[1.55] text-muted-foreground">
            {summary}
          </p>
        )}

        {(stack || roles.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {stack && <Chip>{stack}</Chip>}
            {roles.length > 0 && (
              <Chip tone="jade">
                <span className="truncate">
                  {t('showcase.seeking', {
                    roles: roles
                      .slice(0, ROLES_SHOWN)
                      .map((role) => t(`teamRoles.${role.id}`))
                      .join(', '),
                  })}
                </span>
                {roles.length > ROLES_SHOWN && <span className="shrink-0 opacity-75">+{roles.length - ROLES_SHOWN}</span>}
              </Chip>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2.5 border-t border-border-subtle pt-2.5">
          <TeamFaces team={project.team} memberCount={project.memberCount} recruiting={recruiting} />
          <span className="flex-1" />
          <Link
            to={recruiting ? `${href}#roles` : href}
            viewTransition
            onPointerEnter={preload}
            onFocus={preload}
            className={cn(
              'group/roles relative z-10 inline-flex items-center gap-1 rounded-full text-[0.8125rem] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
              recruiting ? 'text-jade' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(recruiting ? 'showcase.seeRoles' : 'showcase.seeProject')}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/roles:translate-x-1 rtl:-scale-x-100 rtl:group-hover/card:-translate-x-0.5 rtl:group-hover/roles:-translate-x-1"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Crédit de la photo (auteur et licence), lien vers sa source. */
function PhotoCredit({ credit, source }: { credit: string; source: string | null }) {
  const { t } = useTranslation();
  const label = t('showcase.photoCredit', { credit });
  const className =
    'absolute end-2 top-2 z-10 max-w-[75%] truncate rounded-full bg-kente-night/45 px-2 py-0.5 font-mono text-[0.625rem] leading-4 text-kente-paper/80 backdrop-blur-sm';

  return source ? (
    <a
      href={source}
      target="_blank"
      rel="noreferrer"
      className={cn(className, 'outline-none transition-colors hover:text-kente-paper focus-visible:ring-2 focus-visible:ring-ring/70')}
    >
      {label}
    </a>
  ) : (
    <span className={className}>{label}</span>
  );
}

/**
 * Les rôles ouverts et leur issue « premier pas », qui glissent sur la photo au survol : on voit par
 * où commencer avant même d'ouvrir le projet. Décoratif : la page du projet les détaille.
 */
function FirstSteps({ project }: { project: Project }) {
  const { t } = useTranslation();

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-linear-to-t from-kente-night/92 via-kente-night/72 to-transparent px-4 pt-10 pb-3',
        'translate-y-4 opacity-0 transition-[translate,opacity] duration-400 ease-out-expo',
        'group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100',
      )}
    >
      <p className="font-mono text-[0.625rem] tracking-[0.08em] text-kente-paper/70 uppercase">{t('showcase.firstSteps')}</p>
      {project.openings.slice(0, 3).map((opening, index) => {
        const role = roleOf(opening.role);
        return (
          <p
            key={opening.id}
            style={{ transitionDelay: `${60 + index * 50}ms` }}
            className="flex translate-y-1 items-center gap-2 text-xs text-kente-paper opacity-0 transition-[translate,opacity] duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
          >
            {role && <WovenMotif motif={role.motif} colors={role.colors} className="h-5 w-auto" />}
            <span dir="auto" className="truncate font-semibold">
              {opening.title}
            </span>
            {opening.starterIssueNumber && (
              <span className="ms-auto shrink-0 font-mono text-kente-paper/75">#{opening.starterIssueNumber}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

/** L'équipe, le porteur d'abord. Au survol, elle s'écarte : une place vide attend le visiteur. */
function TeamFaces({ team, memberCount, recruiting }: { team: UserSummary[]; memberCount: number; recruiting: boolean }) {
  const { t } = useTranslation();
  const shown = team.slice(0, TEAM_SHOWN);

  return (
    <span className="flex items-center">
      <span className="sr-only">{t('showcase.team', { count: memberCount })}</span>
      {shown.map((member, index) => (
        <UserAvatar
          key={member.id}
          user={member}
          size="sm"
          className={cn(
            'ring-2 ring-background transition-[margin] duration-300 ease-out-expo',
            index > 0 && '-ms-2 group-hover/card:-ms-1',
          )}
        />
      ))}
      {recruiting && (
        <span
          aria-hidden
          className="-ms-2 grid size-7 shrink-0 scale-75 place-items-center rounded-full border border-dashed border-jade/70 bg-background text-jade opacity-0 transition-[margin,scale,opacity] duration-300 ease-out-expo group-hover/card:ms-1 group-hover/card:scale-100 group-hover/card:opacity-100"
        >
          <Plus className="size-3.5" />
        </span>
      )}
    </span>
  );
}

/** Deux technologies du projet : les plus connues d'abord, puis les plus répandues sur la plateforme. */
function stackOf(project: Project): string {
  return [...project.tags]
    .sort((a, b) => {
      const known = Number(TECHNOLOGIES.has(b.name.toLowerCase())) - Number(TECHNOLOGIES.has(a.name.toLowerCase()));
      return known || b.usageCount - a.usageCount;
    })
    .slice(0, 2)
    .map((tag) => tag.name)
    .join(' · ');
}

/** Rôles distincts des annonces ouvertes, dans l'ordre où le projet les a publiés. */
function uniqueRoles(project: Project): RoleDefinition[] {
  const seen = new Map<string, RoleDefinition>();
  for (const opening of project.openings) {
    const role = roleOf(opening.role);
    if (role && !seen.has(role.id)) {
      seen.set(role.id, role);
    }
  }
  return [...seen.values()];
}

/** Sans accroche : la première phrase de la description, sans la mise en forme Markdown. */
function firstSentence(markdown: string | null): string | null {
  if (!markdown) {
    return null;
  }
  const text = markdown
    .replace(/[#>*_`~[\]]/g, '')
    .replace(/\(https?:[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const end = text.search(/[.!?](\s|$)/);
  return end > 0 ? text.slice(0, end + 1) : text;
}

/** Même encombrement qu'une carte, pendant le chargement. Design 3H (squelette à reflet). */
export function ProjectCardSkeleton() {
  return (
    <div aria-hidden className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="h-45 skeleton-shimmer" />
      <div className="flex flex-1 flex-col gap-3 p-5.5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-2/5 rounded-full skeleton-shimmer" />
          <div className="h-3 w-10 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-3 w-full rounded-full skeleton-shimmer" />
        <div className="h-3 w-3/4 rounded-full skeleton-shimmer" />
        <div className="flex gap-1.5">
          <div className="h-5 w-24 rounded-full skeleton-shimmer" />
          <div className="h-5 w-36 rounded-full skeleton-shimmer" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-2.5">
          <div className="h-7 w-20 rounded-full skeleton-shimmer" />
          <div className="h-3 w-24 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
