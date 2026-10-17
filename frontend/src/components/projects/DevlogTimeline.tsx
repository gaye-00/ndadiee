import { ChevronDown } from 'lucide-react';
import { m, useScroll, useSpring } from 'motion/react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import InlineMarkdown from './InlineMarkdown';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { useProjectDevlog } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { DevlogEntry, Project } from '@/types/project.types';
import type { UserSummary } from '@/types/user.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

// Les jalons prennent tour à tour les trois couleurs du kente
const DOTS = ['bg-kente-jade', 'bg-kente-gold', 'bg-kente-coral'] as const;

/**
 * Devlog du projet : ce qui change, version après version, les entrées les plus récentes d'abord.
 * Design 3D.
 *
 * Le fil du temps se colore à mesure qu'on lit ; chaque jalon s'allume en arrivant à l'écran. Les
 * mentions (@ama_owusu) mènent au profil du membre, nommé comme dans l'équipe.
 */
export default function DevlogTimeline({ project, className }: { project: Project; className?: string }) {
  const { t } = useTranslation();
  const devlog = useProjectDevlog(project.id);
  const entries = devlog.data?.pages.flatMap((page) => page.content) ?? [];
  const total = devlog.data?.pages[0]?.totalElements ?? 0;
  // Les mentions nomment l'équipe, et les auteurs déjà affichés
  const people: UserSummary[] = [...project.team, ...entries.map((entry) => entry.author)];

  return (
    <section aria-labelledby="devlog-title" className={cn('min-w-0', className)}>
      <div className="flex items-end justify-between gap-4">
        <h2 id="devlog-title" className="font-display text-h4">
          {t('project.devlog.title')}
        </h2>
        {total > 0 && <span className="font-mono text-xs text-faint-foreground">{t('project.devlog.entries', { count: total })}</span>}
      </div>

      {devlog.isPending ? (
        <div className="mt-6 grid h-32 place-items-center rounded-[1.375rem] border border-dashed border-border">
          <PulsatingDots label={t('states.loading')} />
        </div>
      ) : devlog.isError ? (
        <ErrorState title={t('errors.generic')} onRetry={() => void devlog.refetch()} className="mt-5" />
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{t('project.devlog.empty')}</p>
      ) : (
        <>
          <DevlogList entries={entries} people={people} />
          {devlog.hasNextPage && (
            <button
              type="button"
              onClick={() => void devlog.fetchNextPage()}
              disabled={devlog.isFetchingNextPage}
              className="group/more ms-[2.125rem] mt-1 inline-flex h-9 items-center gap-2 rounded-full border border-border-strong px-3.5 text-[0.8125rem] font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-70"
            >
              {devlog.isFetchingNextPage ? (
                <PulsatingDots size="sm" />
              ) : (
                <ChevronDown aria-hidden className="size-4 transition-transform group-hover/more:translate-y-0.5" />
              )}
              {t('project.devlog.more')}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Les entrées, sur le fil du temps qui se colore à mesure qu'on lit. */
function DevlogList({ entries, people }: { entries: DevlogEntry[]; people: UserSummary[] }) {
  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 85%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <ol ref={list} className="relative mt-6">
      {/* Le fil du temps, et sa part déjà lue */}
      <span aria-hidden className="absolute start-[7px] top-2 bottom-3 w-0.5 rounded-full bg-foreground/8" />
      <m.span
        aria-hidden
        style={{ scaleY: progress }}
        className="absolute start-[7px] top-2 bottom-3 w-0.5 origin-top rounded-full bg-linear-to-b from-kente-jade via-kente-gold to-kente-coral"
      />
      {entries.map((entry, index) => (
        <DevlogItem key={entry.id} entry={entry} dot={DOTS[index % DOTS.length]} people={people} last={index === entries.length - 1} />
      ))}
    </ol>
  );
}

function DevlogItem({ entry, dot, people, last }: { entry: DevlogEntry; dot: string; people: UserSummary[]; last: boolean }) {
  const { t } = useTranslation();

  return (
    <m.li
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative grid grid-cols-[1rem_minmax(0,1fr)] gap-x-[1.125rem]', last ? 'pb-2' : 'pb-6')}
    >
      {/* Le jalon, qui s'allume en arrivant */}
      <span className="relative mt-1.5 grid size-4 place-items-center">
        <m.span
          aria-hidden
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.1 }}
          className={cn('size-3 rounded-full ring-4 ring-background', dot)}
        />
      </span>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
          {entry.version && <span className="rounded-md bg-foreground/7 px-1.5 py-0.5 font-semibold text-foreground">{entry.version}</span>}
          <time dateTime={entry.createdAt} title={formatDate(entry.createdAt)}>
            {formatRelativeTime(entry.createdAt)}
          </time>
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <Link
            to={paths.profile(entry.author.username)}
            viewTransition
            className="inline-flex items-center gap-1.5 rounded-full outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <UserAvatar user={entry.author} size="sm" className="size-5 text-[0.5rem]" />
            <span className="sr-only">{t('project.devlog.by', { name: entry.author.fullName })}</span>
            <span aria-hidden>{entry.author.fullName}</span>
          </Link>
        </p>
        <p dir="auto" className="mt-1.5 text-start text-[0.9375rem] leading-relaxed text-soft-foreground rtl:text-right">
          <InlineMarkdown text={entry.body} people={people} />
        </p>
      </div>
    </m.li>
  );
}
