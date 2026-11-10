import { Check, ChevronDown, Code2, ExternalLink, LayoutDashboard, Play, Scale, Share2, Star, Trophy, Users } from 'lucide-react';
import { AnimatePresence, m, type Variants } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InlineMarkdown from './InlineMarkdown';
import { markdownBlocks } from './markdownBlocks';
import { FOCUS_ROLES_EVENT } from './projectEvents';
import Chip from '@/components/shared/Chip';
import GithubMark from '@/components/shared/GithubMark';
import StackLogo from '@/components/shared/StackLogo';
import { tagLogoOf } from '@/config/stacks';
import { useAuth } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useVote } from '@/hooks/useVotes';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { HackathonBrief, Project } from '@/types/project.types';
import { formatCount, formatRelativeTime, isolate } from '@/utils/formatters';
import { codeSourceOf, isPlaceholderUrl } from '@/utils/repository';

// Les éléments de l'en-tête arrivent l'un après l'autre
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const OUTLINE =
  'inline-flex h-11 items-center gap-2 rounded-[0.875rem] border border-border-strong px-3.5 text-sm font-bold text-foreground transition-[background-color,border-color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:border-foreground/30 hover:bg-foreground/5 active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * En-tête de la page projet : statut, nom, accroche, technologies, et ce qu'on peut faire (rejoindre
 * l'équipe, voir la démo, lire le code, mettre une étoile, partager). Design 3D.
 *
 * Le nom se tisse lettre à lettre à l'arrivée, souligné d'un fil kente. « Rejoindre l'équipe » descend
 * vers les rôles recherchés et montre le plus proche du profil ; un membre ouvre directement l'espace
 * d'équipe.
 */
export default function ProjectHero({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const blocks = markdownBlocks(project.description);
  // L'accroche : le premier paragraphe de la description, sinon la phrase de la carte
  const [first, ...rest] = blocks;
  const lead = first?.kind === 'paragraph' ? first.text : project.tagline;
  const more = first?.kind === 'paragraph' ? rest : blocks;
  const recruiting = project.openings.length > 0;
  const hackathon = project.hackathon;

  return (
    <m.div variants={stagger} initial="hidden" animate="shown" className="relative flex min-w-0 flex-col gap-4">
      {/* Statut */}
      <m.div variants={rise} className="flex flex-wrap gap-2">
        {recruiting ? (
          <Chip tone="jade">
            <span aria-hidden className="live-dot size-1.5" />
            {t('project.recruiting', { count: project.openings.length })}
          </Chip>
        ) : (
          <Chip>{t('project.notRecruiting')}</Chip>
        )}
        {project.license && (
          <Chip>
            <Scale aria-hidden className="size-3" />
            {t('project.license', { license: isolate(project.license) })}
          </Chip>
        )}
        {hackathon && <HackathonChip hackathon={hackathon} />}
      </m.div>

      <m.div variants={rise}>
        <ProjectTitle name={project.name} />
      </m.div>

      {lead && (
        <m.p variants={rise} dir="auto" className="max-w-[40rem] text-start text-lead text-soft-foreground rtl:text-right">
          <InlineMarkdown text={lead} />
        </m.p>
      )}

      {/* La suite de la description, à la demande */}
      {more.length > 0 && (
        <m.div variants={rise} className="-mt-1 max-w-[40rem]">
          <AnimatePresence initial={false}>
            {expanded && (
              <m.div
                key="more"
                id="project-story"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div dir="auto" className="flex flex-col gap-3 pb-3 text-start text-[0.9375rem] leading-relaxed text-muted-foreground rtl:text-right">
                  {more.map((block, index) =>
                    block.kind === 'list' ? (
                      <ul key={index} className="flex flex-col gap-1.5">
                        {block.items.map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold" />
                            <span>
                              <InlineMarkdown text={item} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p key={index}>
                        <InlineMarkdown text={block.text} />
                      </p>
                    ),
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="project-story"
            onClick={() => setExpanded((value) => !value)}
            className="group/more inline-flex items-center gap-1 rounded-md text-sm font-semibold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t(expanded ? 'project.readLess' : 'project.readMore')}
            <ChevronDown aria-hidden className={cn('size-4 transition-transform duration-300', expanded && 'rotate-180')} />
          </button>
        </m.div>
      )}

      <m.div variants={rise}>
        <TagList project={project} />
      </m.div>

      <m.div variants={rise} className="mt-1.5 flex flex-wrap items-center gap-2">
        <PrimaryAction project={project} />
        {project.demoUrl && <DemoLink slug={project.slug} url={project.demoUrl} />}
        {project.repositoryUrl && <RepositoryLink slug={project.slug} url={project.repositoryUrl} />}
        {/* L'étoile et le partage vont ensemble, à la ligne s'il le faut */}
        <span className="flex items-center gap-1">
          <StarButton project={project} />
          <ShareButton project={project} />
        </span>
      </m.div>
    </m.div>
  );
}

/** Le nom, lettre à lettre, et le fil kente qui se tisse dessous. */
function ProjectTitle({ name }: { name: string }) {
  // Des morceaux insécables, coupés après les tirets : « naija-k8s- » / « starter »
  const chunks = name.split(/(?<=[-\s])/);
  let index = 0;

  return (
    <h1 id="project-title" className="relative pb-3 font-display text-h1 break-words">
      <span className="sr-only">{name}</span>
      <span aria-hidden dir="auto">
        {chunks.map((chunk) => (
          <span key={`${chunk}-${index}`} className="inline-block whitespace-pre">
            {Array.from(chunk).map((letter) => {
              const delay = 0.12 + index++ * 0.028;
              return (
                <m.span
                  key={`${letter}-${index}`}
                  initial={{ opacity: 0, y: '0.35em', filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                >
                  {letter}
                </m.span>
              );
            })}
          </span>
        ))}
      </span>
      <m.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute start-0 bottom-0 h-1 w-24 origin-left rounded-full bg-kente rtl:origin-right"
      />
    </h1>
  );
}

/** Les technologies : leur logo quand il y en a un ; chacune mène aux projets qui l'utilisent. */
function TagList({ project }: { project: Project }) {
  const logos = useStackLogos();

  return (
    <ul className="flex flex-wrap gap-1.5">
      {project.tags.map((tag) => {
        const logo = tagLogoOf(tag.slug);
        return (
          <li key={tag.id}>
            <Link
              to={`${paths.showcase}?tag=${encodeURIComponent(tag.slug)}`}
              viewTransition
              className="group/tag inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground/8 px-2.5 text-xs font-semibold text-soft-foreground outline-none transition-[background-color,color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:bg-foreground/12 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {logo && logos !== false && <StackLogo path={logos?.[logo]} className="size-3 opacity-80 group-hover/tag:opacity-100" />}
              {tag.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Rejoindre l'équipe (descend vers les rôles), ou l'espace d'équipe pour un membre. */
function PrimaryAction({ project }: { project: Project }) {
  const { t } = useTranslation();
  const status = project.myMembershipStatus;

  if (status === 'ACCEPTED') {
    return (
      <GradientLink to={paths.workspace(project.slug)} icon={<LayoutDashboard aria-hidden className="size-4" />}>
        {t('project.openWorkspace')}
      </GradientLink>
    );
  }
  if (status === 'PENDING') {
    return (
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(FOCUS_ROLES_EVENT))}
        className="inline-flex h-11 items-center gap-2 rounded-[0.875rem] border border-jade/40 bg-jade/10 px-4 text-sm font-bold text-jade outline-none transition-colors hover:bg-jade/15 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <Check aria-hidden className="size-4" strokeWidth={3} />
        {t('project.applied')}
      </button>
    );
  }
  if (project.openings.length === 0) {
    return null;
  }
  return (
    <GradientButton onClick={() => window.dispatchEvent(new Event(FOCUS_ROLES_EVENT))} icon={<Users aria-hidden className="size-4" />}>
      {t('project.join')}
    </GradientButton>
  );
}

const GRADIENT =
  'group/cta relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-[0.875rem] bg-kente-warm px-4.5 text-sm font-bold text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] outline-none transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_16px_34px_-12px_var(--kente-coral)] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Reflet qui traverse un bouton au survol */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/cta:translate-x-[400%] rtl:translate-x-full rtl:group-hover/cta:-translate-x-[400%]"
    />
  );
}

function GradientButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={GRADIENT}>
      {icon}
      {children}
      <Sheen />
    </button>
  );
}

function GradientLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} viewTransition className={GRADIENT}>
      {icon}
      {children}
      <Sheen />
    </Link>
  );
}

/**
 * La démo : son adresse dans un nouvel onglet ; une démo de démonstration (adresse en example.com, qui ne mène nulle
 * part) ouvre la page d'attente du projet.
 */
function DemoLink({ slug, url }: { slug: string; url: string }) {
  const { t } = useTranslation();
  const icon = <Play aria-hidden className="size-3.5 fill-current transition-transform duration-300 group-hover/demo:scale-110" />;

  if (isPlaceholderUrl(url)) {
    return (
      <Link to={paths.projectDemo(slug)} viewTransition className={cn(OUTLINE, 'group/demo')}>
        {icon}
        {t('project.demo')}
      </Link>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={cn(OUTLINE, 'group/demo')}>
      {icon}
      {t('project.demo')}
      <ExternalLink aria-hidden className="size-3.5 text-faint-foreground" />
    </a>
  );
}

/**
 * Le code source, avec le logo de GitHub quand il y est ; l'adresse du dépôt en bulle. Un dépôt GitHub public, ou de
 * démonstration, se lit dans Ndadiee (page « Code source ») ; un dépôt ailleurs s'ouvre dans un nouvel onglet.
 */
function RepositoryLink({ slug, url }: { slug: string; url: string }) {
  const { t } = useTranslation();
  const source = codeSourceOf(url);
  let label = url;
  try {
    const parsed = new URL(url);
    label = `${parsed.hostname}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    // Adresse mal formée : affichée telle quelle dans la bulle
  }
  const icon = source === 'github' ? <GithubMark className="size-4 shrink-0" /> : <Code2 aria-hidden className="size-4 shrink-0" />;

  // Un dépôt fictif sans code fourni mène aussi à la page, qui l'explique : jamais de lien mort
  if (source || isPlaceholderUrl(url)) {
    return (
      <Link to={paths.projectCode(slug)} viewTransition title={source === 'demo' ? undefined : label} className={cn(OUTLINE, 'group/repo')}>
        {icon}
        {t('project.source')}
      </Link>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title={label} className={cn(OUTLINE, 'group/repo')}>
      {icon}
      {t('project.source')}
      <ExternalLink aria-hidden className="size-3.5 text-faint-foreground" />
    </a>
  );
}

// Les éclats de l'étoile : un tour complet, aux trois couleurs du kente
const SPARKS = Array.from({ length: 8 }, (_, index) => ({
  angle: (index / 8) * Math.PI * 2,
  color: ['var(--kente-gold)', 'var(--kente-coral)', 'var(--kente-jade)'][index % 3],
}));

/**
 * L'étoile du projet : un clic, et elle s'allume dans un éclat kente. Le nombre suit tout de suite ;
 * le serveur confirme ensuite. Un visiteur est invité à se connecter ; le porteur ne s'en met pas.
 */
function StarButton({ project }: { project: Project }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const reduced = useReducedMotion();
  const vote = useVote();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [bursts, setBursts] = useState(0);
  const own = user?.id === project.owner.id;
  const starred = optimistic ?? project.starredByMe === true;
  const count = project.starsCount + (optimistic === null || optimistic === (project.starredByMe === true) ? 0 : optimistic ? 1 : -1);

  function toggle() {
    if (!isAuthenticated) {
      void navigate(paths.login, { state: { from: location } });
      return;
    }
    const next = !starred;
    setOptimistic(next);
    if (next) {
      setBursts((value) => value + 1);
    }
    vote.mutate(
      { targetType: 'PROJECT', targetId: project.id, value: next ? 1 : 0 },
      { onSettled: () => setOptimistic(null) },
    );
  }

  return (
    <button
      type="button"
      aria-pressed={own ? undefined : starred}
      aria-disabled={own || undefined}
      disabled={own}
      onClick={toggle}
      title={t('project.star')}
      className={cn(
        'group/star relative inline-flex h-11 items-center gap-2 rounded-[0.875rem] px-3.5 font-mono text-sm outline-none transition-[background-color,color,border-color] duration-300',
        'focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-default',
        starred ? 'border border-gold/45 bg-gold/12 text-gold' : 'border border-transparent text-gold hover:border-gold/30 hover:bg-gold/8',
      )}
    >
      <span className="relative grid place-items-center">
        <m.span key={bursts} initial={false} animate={bursts > 0 && !reduced ? { scale: [1, 1.45, 1], rotate: [0, -18, 0] } : {}} transition={{ duration: 0.5 }}>
          <Star aria-hidden className={cn('size-4 transition-[fill] duration-300', starred && 'fill-current')} />
        </m.span>
        {/* Éclats */}
        <AnimatePresence>
          {bursts > 0 && !reduced && (
            <m.span key={bursts} aria-hidden className="pointer-events-none absolute inset-0" initial="from" animate="to" exit={{ opacity: 0 }}>
              {SPARKS.map((spark, index) => (
                <m.span
                  key={index}
                  className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full"
                  style={{ backgroundColor: spark.color }}
                  variants={{
                    from: { x: 0, y: 0, scale: 1, opacity: 1 },
                    to: { x: Math.cos(spark.angle) * 22, y: Math.sin(spark.angle) * 22, scale: 0, opacity: 0 },
                  }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </m.span>
          )}
        </AnimatePresence>
      </span>
      {/* Le nombre roule d'un chiffre à l'autre */}
      <span className="relative inline-grid overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={count}
            initial={{ y: starred ? '100%' : '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: starred ? '-100%' : '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            {formatCount(count)}
          </m.span>
        </AnimatePresence>
      </span>
      <span className="sr-only">{t('project.stars', { count })}</span>
    </button>
  );
}

/** Partager : la feuille de partage du téléphone, sinon le lien copié. */
function ShareButton({ project }: { project: Project }) {
  const { t } = useTranslation();

  async function share() {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: project.name, text: project.tagline ?? undefined, url });
        return;
      } catch (error) {
        // Partage annulé : rien à dire
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('project.linkCopied'));
    } catch {
      toast(url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={t('project.share')}
      title={t('project.share')}
      className="grid size-11 place-items-center rounded-[0.875rem] text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      <Share2 aria-hidden className="size-4" />
    </button>
  );
}

/** La prochaine échéance d'un hackathon : fin des inscriptions, début, puis fin de l'événement. */
function nextDeadline(hackathon: HackathonBrief): string | null {
  const now = Date.now();
  return (
    [hackathon.registrationClosesAt, hackathon.startsAt, hackathon.endsAt].find(
      (date): date is string => !!date && new Date(date).getTime() > now,
    ) ?? null
  );
}

/** Le hackathon auquel le projet est inscrit, et le temps qui reste. */
function HackathonChip({ hackathon }: { hackathon: HackathonBrief }) {
  const { t } = useTranslation();
  const future = nextDeadline(hackathon);

  return (
    <Link
      to={paths.hackathon(hackathon.slug)}
      viewTransition
      className="rounded-full outline-none transition-transform duration-300 ease-out-expo hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      <Chip tone="gold">
        <Trophy aria-hidden className="size-3" />
        {t('project.hackathon', { title: isolate(hackathon.title) })}
        {future && <span className="font-mono opacity-80">· {t('project.hackathonEnds', { time: formatRelativeTime(future) })}</span>}
      </Chip>
    </Link>
  );
}
