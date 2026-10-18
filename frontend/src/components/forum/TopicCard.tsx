import { ArrowBigUp, CircleCheck, Eye, Lock, MessageSquare, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BookmarkButton from './BookmarkButton';
import { tagAccent } from './forumUtils';
import TopicTag from './TopicTag';
import Chip from '@/components/shared/Chip';
import UserAvatar from '@/components/shared/UserAvatar';
import { useNow } from '@/hooks/useNow';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { QuestionSummary } from '@/types/question.types';
import { countryFlag, formatCount, formatDate, formatRelativeTime } from '@/utils/formatters';

// Un sujet de moins d'un jour est « nouveau »
const FRESH_MS = 24 * 3600 * 1000;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface TopicCardProps {
  topic: QuestionSummary;
  /** Les filtres du forum en cours : un tag cliqué les garde (vue, ordre) */
  params?: URLSearchParams;
  /** Le tag du filtre en cours, mis en avant sur la carte */
  activeTag?: string | null;
}

/**
 * Un sujet du fil, comme une carte de dev.to : l'auteur et la date, le titre, un extrait, les tags ; dessous, les
 * votes, les réponses (en vert quand une réponse est acceptée), les vues, le temps de lecture et le marque-page.
 * Toute la carte mène au sujet ; l'auteur, les tags, les réponses et le marque-page restent cliquables à part. Au
 * survol, la carte se soulève dans la couleur de son premier tag.
 */
export default function TopicCard({ topic, params, activeTag }: TopicCardProps) {
  const { t } = useTranslation('forum');
  const href = paths.topic(topic.slug);
  const preload = () => prefetch(pages.topic);
  // L'heure, à la minute près : « Nouveau » s'en va de lui-même au bout d'un jour
  const now = useNow(60_000);
  const fresh = now - new Date(topic.createdAt).getTime() < FRESH_MS;
  const solved = topic.hasAcceptedAnswer;
  const closed = topic.status === 'CLOSED';
  const author = topic.author;

  return (
    <article
      style={tagAccent(topic.tags[0]?.slug)}
      className={cn(
        'group/topic glass relative rounded-2xl p-4 transition-[translate,border-color,box-shadow] duration-300 ease-out-expo sm:p-5',
        'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tag-accent)_40%,transparent)] hover:shadow-[0_22px_44px_-30px_var(--tag-accent)]',
        'focus-within:border-[color-mix(in_srgb,var(--tag-accent)_40%,transparent)]',
      )}
    >
      {/* ── L'auteur ── */}
      <div className="flex items-center gap-2.5">
        <Link to={paths.profile(author.username)} viewTransition tabIndex={-1} aria-hidden className="relative z-10 shrink-0 rounded-full">
          <UserAvatar user={author} size="md" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex min-w-0 items-center gap-1.5">
            <Link
              to={paths.profile(author.username)}
              viewTransition
              dir="auto"
              className={cn('relative z-10 truncate rounded-sm text-sm font-semibold text-foreground hover:underline', focusRing)}
            >
              {author.fullName}
            </Link>
            {author.country && <span className="shrink-0 text-[0.8125rem] leading-none">{countryFlag(author.country)}</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <time dateTime={topic.createdAt} title={formatDate(topic.createdAt)}>
              {formatRelativeTime(topic.createdAt)}
            </time>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {solved && (
            <Chip tone="jade">
              <CircleCheck aria-hidden className="size-3.5" />
              {t('card.solved')}
            </Chip>
          )}
          {closed && (
            <Chip>
              <Lock aria-hidden className="size-3" />
              {t('card.closed')}
            </Chip>
          )}
          {fresh && !solved && (
            <Chip tone="gold">
              <Sparkles aria-hidden className="size-3" />
              {t('card.new')}
            </Chip>
          )}
        </div>
      </div>

      {/* ── Le sujet ── sous le nom de l'auteur, comme sur dev.to */}
      <div className="mt-3 sm:ps-[2.875rem]">
        <h3 dir="auto" className="font-sans text-lg leading-snug font-bold text-foreground sm:text-xl">
          {/* Le lien couvre toute la carte */}
          <Link
            to={href}
            viewTransition
            onPointerEnter={preload}
            onFocus={preload}
            className="rounded-sm outline-none transition-colors after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover/topic:text-(--tag-accent) focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
          >
            {topic.title}
          </Link>
        </h3>
        {topic.excerpt && (
          <p dir="auto" className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {topic.excerpt}
          </p>
        )}
        {topic.tags.length > 0 && (
          <ul className="mt-2.5 -ms-2 flex flex-wrap gap-0.5">
            {topic.tags.map((tag) => (
              <li key={tag.slug} className="min-w-0">
                <TopicTag tag={tag} params={params} active={tag.slug === activeTag} />
              </li>
            ))}
          </ul>
        )}

        {/* ── Ce qu'il s'y passe ── */}
        <div className="mt-3 -ms-2 flex items-center gap-0.5 text-[0.8125rem] text-muted-foreground">
          <Stat icon={<ArrowBigUp className="size-4.5" />} label={t('card.votes', { count: topic.score })}>
            {formatCount(topic.score)}
          </Stat>
          <Link
            to={`${href}#answers`}
            viewTransition
            onPointerEnter={preload}
            aria-label={t(solved ? 'card.answersSolved' : 'card.answers', { count: topic.answerCount })}
            className={cn(
              'relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-foreground/6 hover:text-foreground',
              solved && 'text-jade hover:text-jade',
              topic.answerCount === 0 && !closed && 'text-gold hover:text-gold',
              focusRing,
            )}
          >
            {solved ? <CircleCheck aria-hidden className="size-4" /> : <MessageSquare aria-hidden className="size-4" />}
            <span aria-hidden>
              {topic.answerCount === 0 && !closed ? t('card.noAnswer') : formatCount(topic.answerCount)}
            </span>
            <span aria-hidden className="hidden sm:inline">
              {topic.answerCount > 0 && t('card.answersWord', { count: topic.answerCount })}
            </span>
          </Link>
          <Stat icon={<Eye className="size-4" />} label={t('card.views', { count: topic.viewCount })} className="hidden min-[26rem]:inline-flex">
            {formatCount(topic.viewCount)}
          </Stat>
          <span className="ms-auto hidden px-2 text-xs sm:inline">{t('card.reading', { count: topic.readingMinutes })}</span>
          <BookmarkButton topic={topic} className="ms-auto sm:ms-0" />
        </div>
      </div>
    </article>
  );
}

function Stat({ icon, label, children, className }: { icon: ReactNode; label: string; children: ReactNode; className?: string }) {
  return (
    <span title={label} className={cn('inline-flex h-8 items-center gap-1.5 px-2 tabular-nums', className)}>
      <span aria-hidden className="grid place-items-center">
        {icon}
      </span>
      <span aria-hidden>{children}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Même encombrement qu'un sujet, pendant le chargement. Design 3H (squelette à reflet). */
export function TopicCardSkeleton() {
  return (
    <div aria-hidden className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="size-9 rounded-full skeleton-shimmer" />
        <span className="flex flex-col gap-1.5">
          <span className="h-3 w-28 rounded-full skeleton-shimmer" />
          <span className="h-2.5 w-16 rounded-full skeleton-shimmer" />
        </span>
      </div>
      <div className="mt-3.5 flex flex-col gap-2.5 sm:ps-[2.875rem]">
        <span className="h-5 w-4/5 rounded-full skeleton-shimmer" />
        <span className="h-3 w-full rounded-full skeleton-shimmer" />
        <span className="h-3 w-2/3 rounded-full skeleton-shimmer" />
        <span className="mt-1 flex gap-2">
          {[16, 20, 14].map((width) => (
            <span key={width} className="h-6 rounded-lg skeleton-shimmer" style={{ width: `${width * 0.25}rem` }} />
          ))}
        </span>
        <span className="mt-1 flex items-center gap-4">
          <span className="h-4 w-10 rounded-full skeleton-shimmer" />
          <span className="h-4 w-20 rounded-full skeleton-shimmer" />
          <span className="h-4 w-12 rounded-full skeleton-shimmer" />
          <span className="ms-auto size-8 rounded-xl skeleton-shimmer" />
        </span>
      </div>
    </div>
  );
}
