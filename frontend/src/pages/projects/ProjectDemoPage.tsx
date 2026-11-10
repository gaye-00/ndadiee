import { ArrowLeft, Check, CircleDashed, Code2, ExternalLink, Eye, Lock, Play, Users } from 'lucide-react';
import { AnimatePresence, m, type Variants } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import Chip from '@/components/shared/Chip';
import WovenMotif, { WovenThreads } from '@/components/shared/WovenMotif';
import { site } from '@/config/site';
import { useProject } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { Project } from '@/types/project.types';
import { codeSourceOf, isPlaceholderUrl } from '@/utils/repository';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const PRIMARY = cn(
  'group/cta relative isolate inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-[0.875rem] bg-kente-warm px-5 text-[0.9375rem] font-bold text-kente-night',
  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_16px_34px_-12px_var(--kente-coral)]',
  focusRing,
);
const SECONDARY = cn(
  'inline-flex h-12 items-center gap-2.5 rounded-[0.875rem] border border-border-strong px-5 text-[0.9375rem] font-bold text-foreground',
  'transition-[background-color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:bg-foreground/5',
  focusRing,
);
// Une capture toutes les quatre secondes dans la fenêtre d'aperçu
const SLIDE_MS = 4000;

// Une fusée tissée : le motif de la page, comme le « 404 » de la page introuvable
const ROCKET = [
  '.....##.....',
  '....####....',
  '...######...',
  '...##++##...',
  '...#++++#...',
  '...##++##...',
  '...######...',
  '...######...',
  '..########..',
  '.##########.',
  '##.######.##',
  '#...####...#',
  '.....++.....',
  '....+..+....',
  '.....++.....',
];

const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/** Une image de l'aperçu : les captures du projet, sinon sa couverture */
interface Shot {
  key: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
}

function shotsOf(project: Project): Shot[] {
  const gallery = (project.gallery ?? [])
    .filter((media) => media.kind === 'SCREENSHOT')
    .map((media) => ({ key: `media-${media.id}`, url: media.url, thumbnailUrl: media.thumbnailUrl, caption: media.caption }));
  if (gallery.length > 0) {
    return gallery;
  }
  return project.coverUrl ? [{ key: 'cover', url: project.coverUrl, thumbnailUrl: project.coverThumbnailUrl, caption: null }] : [];
}

/**
 * « Démo live » d'un projet dont la démo n'est pas encore en ligne : plutôt qu'un lien mort, une page qui dit où en est
 * la mise en ligne (code publié, captures, démo), montre les captures de l'équipe dans une fenêtre de navigateur, et
 * mène au code et à l'équipe. Si la démo est en ligne, la page y mène.
 */
export default function ProjectDemoPage() {
  const { slug } = useParams();
  const { t: tc, i18n } = useTranslation();
  const project = useProject(slug);
  const name = project.data?.name;

  useEffect(() => {
    if (!name) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${tc('pages.projectDemo')} · ${name} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [name, tc, i18n.language]);

  if (project.isPending) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <PulsatingDots label={tc('project.loading')} />
      </div>
    );
  }
  if (project.isError) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
          <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
          <h1 className="font-display text-h4">{tc('project.notFoundTitle')}</h1>
          <p className="text-sm text-muted-foreground">{tc('project.notFoundText')}</p>
          <Link to={paths.showcase} viewTransition className="mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70">
            <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {tc('project.backToShowcase')}
          </Link>
        </div>
      </div>
    );
  }

  return <DemoLaunchpad project={project.data} />;
}

function DemoLaunchpad({ project }: { project: Project }) {
  const { t } = useTranslation('projectCode');
  const live = project.demoUrl && !isPlaceholderUrl(project.demoUrl) ? project.demoUrl : null;
  const codeSource = codeSourceOf(project.repositoryUrl);
  const externalRepository = !codeSource && project.repositoryUrl && !isPlaceholderUrl(project.repositoryUrl) ? project.repositoryUrl : null;
  const shots = shotsOf(project);
  const canJoin = project.openings.length > 0 && project.myMembershipStatus !== 'ACCEPTED';

  return (
    <article aria-labelledby="demo-title" className="relative isolate overflow-x-clip">
      <WovenThreads />
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-coral end-[-16rem] top-1/3 -z-10 size-[34rem] opacity-50" />
      <div aria-hidden className="halo halo-jade -bottom-64 start-1/3 -z-10 size-[30rem] opacity-40" />

      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-[90rem] items-center gap-10 px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,38rem)] lg:gap-14 lg:px-10 xl:px-16">
        <m.div variants={stagger} initial="hidden" animate="shown" className="flex min-w-0 flex-col items-start gap-5">
          <m.div variants={rise}>
            <Link
              to={paths.project(project.slug)}
              viewTransition
              className="group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
              <bdi>{project.name}</bdi>
            </Link>
          </m.div>

          <m.div variants={rise} aria-hidden data-weave="in" dir="ltr">
            <span data-weave-in className="block">
              <WovenMotif motif={ROCKET} colors={['gold', 'coral']} className="h-16 w-auto sm:h-20" />
            </span>
          </m.div>

          <m.div variants={rise}>
            <Chip tone={live ? 'jade' : 'gold'}>
              <span aria-hidden className={cn('size-1.5 rounded-full', live ? 'live-dot' : 'animate-pulse-dot bg-gold')} />
              {t(live ? 'demo.statusLive' : 'demo.status')}
            </Chip>
          </m.div>

          <m.h1 variants={rise} id="demo-title" className="font-display text-h1 text-balance">
            {live ? (
              t('demo.liveTitle')
            ) : (
              <>
                {t('demo.title')} <span className="text-kente-warm">{t('demo.titleAccent')}</span>
              </>
            )}
          </m.h1>

          <m.p variants={rise} className="max-w-[36rem] text-lead text-soft-foreground">
            {t(live ? 'demo.liveText' : 'demo.text', { name: project.name })}
          </m.p>

          <m.div variants={rise} className="w-full max-w-[30rem]">
            <LaunchSteps code={codeSource !== null || externalRepository !== null} shots={shots.length > 0} live={live !== null} />
          </m.div>

          <m.div variants={rise} className="mt-1 flex flex-wrap items-center gap-2.5">
            {live ? (
              <a href={live} target="_blank" rel="noreferrer" className={PRIMARY}>
                <Play aria-hidden className="size-4 fill-current" />
                {t('demo.openDemo')}
                <ExternalLink aria-hidden className="size-4 opacity-70" />
              </a>
            ) : codeSource ? (
              <Link to={paths.projectCode(project.slug)} viewTransition className={PRIMARY}>
                <Code2 aria-hidden className="size-4" />
                {t('demo.exploreCode')}
                <Sheen />
              </Link>
            ) : externalRepository ? (
              <a href={externalRepository} target="_blank" rel="noreferrer" className={PRIMARY}>
                <Code2 aria-hidden className="size-4" />
                {t('demo.exploreCode')}
                <ExternalLink aria-hidden className="size-4 opacity-70" />
              </a>
            ) : null}
            <Link to={paths.project(project.slug)} viewTransition className={SECONDARY}>
              {t('demo.backToProject')}
            </Link>
            {canJoin && (
              <Link
                to={paths.projectRoles(project.slug)}
                viewTransition
                className="inline-flex h-12 items-center gap-2 rounded-[0.875rem] px-3 text-[0.9375rem] font-bold text-gold transition-colors hover:bg-gold/8 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
              >
                <Users aria-hidden className="size-4" />
                {t('demo.joinTeam')}
              </Link>
            )}
          </m.div>
        </m.div>

        <DemoPreview project={project} shots={shots} live={live !== null} />
      </div>
    </article>
  );
}

/** Reflet qui traverse le bouton principal au survol */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/cta:translate-x-[400%] rtl:translate-x-full rtl:group-hover/cta:-translate-x-[400%]"
    />
  );
}

/** Où en est la mise en ligne : le code, les captures, puis la démo elle-même. */
function LaunchSteps({ code, shots, live }: { code: boolean; shots: boolean; live: boolean }) {
  const { t } = useTranslation('projectCode');
  const steps = [
    { key: 'code', done: code },
    { key: 'shots', done: shots },
    { key: 'live', done: live },
  ] as const;
  // L'étape en cours : la démo, tant qu'elle n'est pas en ligne
  const current = live ? -1 : steps.length - 1;

  return (
    <section aria-labelledby="launch-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="launch-title" className="eyebrow">
        {t('demo.steps.title')}
      </h2>
      <ol className="mt-4 flex flex-col">
        {steps.map((step, index) => {
          const inProgress = index === current;
          const last = index === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-3.5 pb-4 last:pb-0">
              {!last && (
                <span
                  aria-hidden
                  className={cn('absolute start-[0.8125rem] top-7 bottom-0 w-px', step.done ? 'bg-linear-to-b from-jade/70 to-jade/20' : 'bg-border-strong')}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'relative grid size-[1.625rem] shrink-0 place-items-center rounded-full',
                  step.done ? 'bg-jade/15 text-jade ring-1 ring-jade/40' : inProgress ? 'text-gold' : 'bg-foreground/6 text-faint-foreground',
                )}
              >
                {step.done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : inProgress ? (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold/25 [animation-duration:2.4s] motion-reduce:hidden" />
                    <CircleDashed className="size-[1.625rem] animate-spin-slow motion-reduce:animate-none" />
                  </>
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 pt-0.5">
                <span className={cn('text-sm font-semibold', step.done || inProgress ? 'text-foreground' : 'text-muted-foreground')}>
                  {t(`demo.steps.${step.key}`)}
                </span>
                <span className={cn('font-mono text-[0.6875rem]', step.done ? 'text-jade' : inProgress ? 'text-gold' : 'text-faint-foreground')}>
                  {t(step.done ? 'demo.steps.done' : inProgress ? 'demo.steps.inProgress' : 'demo.steps.todo')}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Une fenêtre de navigateur où défilent les captures de l'équipe, en attendant la vraie démo. */
function DemoPreview({ project, shots, live }: { project: Project; shots: Shot[]; live: boolean }) {
  const { t } = useTranslation('projectCode');
  const reduced = useReducedMotion();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const shot = shots[index % Math.max(1, shots.length)];
  const address = live && project.demoUrl ? project.demoUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : `${project.slug}.demo`;

  useEffect(() => {
    if (reduced || paused || shots.length < 2) {
      return undefined;
    }
    const timer = setInterval(() => setIndex((value) => (value + 1) % shots.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reduced, paused, shots.length]);

  return (
    <m.figure
      initial={{ opacity: 0, y: 28, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="relative min-w-0 [perspective:1400px]"
    >
      {/* Une lueur kente derrière la fenêtre */}
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-kente opacity-25 blur-3xl" />

      <div className="glass relative overflow-hidden rounded-[1.375rem] shadow-[0_40px_90px_-45px_rgb(0_0_0/0.7)]">
        {/* La barre du navigateur */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-kente-coral" />
            <span className="size-2.5 rounded-full bg-kente-gold" />
            <span className="size-2.5 rounded-full bg-kente-jade" />
          </span>
          <span dir="ltr" className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-foreground/6 px-3 font-mono text-xs text-muted-foreground">
            <Lock aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{address}</span>
          </span>
          {!live && (
            <span className="hidden shrink-0 rounded-full bg-gold/12 px-2 py-0.5 font-mono text-[0.625rem] font-semibold tracking-wide text-gold uppercase sm:inline">
              {t('demo.soon')}
            </span>
          )}
        </div>

        {/* L'écran */}
        <div className="relative aspect-[16/10] overflow-hidden bg-background">
          {shot ? (
            <AnimatePresence initial={false} mode="popLayout">
              <m.img
                key={shot.key}
                src={dataSaver ? (shot.thumbnailUrl ?? shot.url) : shot.url}
                alt={shot.caption ?? project.name}
                initial={{ opacity: 0, scale: reduced ? 1 : 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
            </AnimatePresence>
          ) : (
            <div className="hatch grid size-full place-items-center p-6" data-weave="in">
              <div className="flex flex-col items-center gap-4 text-center">
                <span data-weave-in dir="ltr">
                  <WovenMotif motif={ROCKET} colors={['jade', 'gold']} className="h-24 w-auto" />
                </span>
                <p className="max-w-xs text-sm text-muted-foreground">{t('demo.previewEmpty')}</p>
              </div>
            </div>
          )}

          {shot && (
            <>
              <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-sm">
                <Eye aria-hidden className="size-3.5" />
                {t('demo.previewLabel')}
              </span>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/70 to-transparent" />
              {shot.caption && (
                <figcaption key={shot.key} className="absolute inset-x-4 bottom-3.5 text-sm font-semibold text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
                  {shot.caption}
                </figcaption>
              )}
            </>
          )}
        </div>

        {/* La mise en ligne, en cours */}
        {!live && (
          <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-3">
            <span className="font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground">{t('demo.launching')}</span>
            <span aria-hidden className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8">
              <span className="absolute inset-y-0 start-0 w-2/5 rounded-full bg-kente motion-safe:animate-[demo-progress_2.4s_ease-in-out_infinite] rtl:[animation-direction:reverse]" />
            </span>
          </div>
        )}
      </div>

      {shots.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {shots.map((item, position) => (
            <DotButton key={item.key} active={position === index % shots.length} onClick={() => setIndex(position)} label={t('demo.shot', { index: position + 1, total: shots.length })} />
          ))}
        </div>
      )}
    </m.figure>
  );
}

function DotButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active || undefined}
      className={cn(
        'h-2 rounded-full transition-[width,background-color] duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
        active ? 'w-6 bg-gold' : 'w-2 bg-foreground/20 hover:bg-foreground/40',
      )}
    />
  );
}
