import { ArrowRight, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { tagAccent } from './forumUtils';
import { forumSearch } from '@/hooks/useForumFilters';
import { useQuestions } from '@/hooks/useQuestions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { QuestionSummary } from '@/types/question.types';
import { formatRelativeTime } from '@/utils/formatters';

// Sujets montrés dans chaque encadré
const SHOWN = 5;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La marge droite du forum, comme les encadrés de dev.to (#discuss, tendances) : les dernières questions encore
 * sans réponse (« Aide un dev »), les sujets les mieux notés de la semaine, et comment bien poser sa question. Sur
 * très grand écran seulement.
 */
export default function ForumAside({ className }: { className?: string }) {
  const { t } = useTranslation('forum');
  const unanswered = useQuestions({ unanswered: true, sort: 'createdAt,desc', size: SHOWN });
  const trending = useQuestions({ period: 'WEEK', sort: 'score,desc', size: SHOWN });

  return (
    <aside aria-label={t('aside.label')} className={cn('flex flex-col gap-4', className)}>
      <Box
        title={
          <>
            <span aria-hidden className="live-dot size-1.5 bg-kente-gold" />
            {t('aside.helpTitle')}
          </>
        }
        more={{ to: `${paths.forum}${forumSearch({ view: 'unanswered' })}`, label: t('aside.seeAll') }}
      >
        <TopicLinks
          topics={unanswered.data?.content}
          empty={t('aside.helpEmpty')}
          meta={(topic) => (
            <>
              {topic.tags[0] && (
                <span style={tagAccent(topic.tags[0].slug)}>
                  <span className="text-(--tag-accent)">#</span>
                  {topic.tags[0].name}
                </span>
              )}
              <time dateTime={topic.createdAt}>{formatRelativeTime(topic.createdAt)}</time>
            </>
          )}
        />
      </Box>

      <Box title={t('aside.trendingTitle')} more={{ to: `${paths.forum}${forumSearch({ sort: 'top', period: 'week' })}`, label: t('aside.seeAll') }}>
        <TopicLinks
          topics={trending.data?.content}
          empty={t('aside.trendingEmpty')}
          ranked
          meta={(topic) => (
            <>
              <span>{t('card.votes', { count: topic.score })}</span>
              <span>{t('card.answers', { count: topic.answerCount })}</span>
            </>
          )}
        />
      </Box>

      <section aria-labelledby="forum-tips" className="rounded-2xl border border-gold/20 bg-gold/6 p-4">
        <h2 id="forum-tips" className="flex items-center gap-2 font-sans text-sm font-bold text-foreground">
          <Lightbulb aria-hidden className="size-4 text-gold" />
          {t('aside.tipsTitle')}
        </h2>
        <ol className="mt-3 flex flex-col gap-2.5 text-[0.8125rem] leading-relaxed text-soft-foreground">
          {(['title', 'code', 'tried', 'accept'] as const).map((tip, index) => (
            <li key={tip} className="flex gap-2.5">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-kente-gold font-mono text-[0.625rem] font-bold text-kente-night">
                {index + 1}
              </span>
              <span>{t(`aside.tips.${tip}`)}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function Box({ title, more, children }: { title: ReactNode; more: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <h2 className="flex items-center gap-2 font-sans text-sm font-bold text-foreground">{title}</h2>
        <Link
          to={more.to}
          className={cn('group/more inline-flex items-center gap-1 rounded-full text-xs font-bold text-gold', focusRing)}
        >
          {more.label}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/more:translate-x-0.5 rtl:-scale-x-100" />
        </Link>
      </div>
      {children}
    </section>
  );
}

interface TopicLinksProps {
  topics: QuestionSummary[] | undefined;
  empty: string;
  /** Numérotés : 01, 02… aux couleurs du kente */
  ranked?: boolean;
  meta: (topic: QuestionSummary) => ReactNode;
}

function TopicLinks({ topics, empty, ranked = false, meta }: TopicLinksProps) {
  if (!topics) {
    return (
      <ul aria-hidden className="flex flex-col">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex flex-col gap-1.5 border-b border-border-subtle px-4 py-3 last:border-0">
            <span className="h-3 w-11/12 rounded-full skeleton-shimmer" />
            <span className="h-2.5 w-1/3 rounded-full skeleton-shimmer" />
          </li>
        ))}
      </ul>
    );
  }
  if (topics.length === 0) {
    return <p className="px-4 py-4 text-[0.8125rem] leading-relaxed text-muted-foreground">{empty}</p>;
  }
  const rankColors = ['text-gold', 'text-coral', 'text-jade'];

  return (
    <ol className="flex flex-col">
      {topics.map((topic, index) => (
        <li key={topic.id} className="border-b border-border-subtle last:border-0">
          <Link
            to={paths.topic(topic.slug)}
            viewTransition
            onPointerEnter={() => prefetch(pages.topic)}
            className={cn('group/aside flex gap-3 px-4 py-3 transition-colors hover:bg-foreground/4', focusRing, 'focus-visible:ring-inset')}
          >
            {ranked && (
              <span aria-hidden className={cn('w-5 shrink-0 pt-0.5 font-mono text-xs font-bold tabular-nums', rankColors[index % rankColors.length])}>
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            <span className="min-w-0">
              <span dir="auto" className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold text-foreground group-hover/aside:text-gold">
                {topic.title}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-2.5 font-mono text-[0.6875rem] text-muted-foreground">{meta(topic)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
