import { Award, CalendarDays, Check, MapPin, Plus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { tagAccent } from './forumUtils';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useMemberAction } from '@/hooks/useMemberAction';
import { useQuestions } from '@/hooks/useQuestions';
import { useFollowUser, useUserProfile } from '@/hooks/useUsers';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Question, QuestionSummary } from '@/types/question.types';
import { countryFlag, countryName, formatCount, formatMonth, formatRelativeTime } from '@/utils/formatters';

// Sujets cités dans « Plus de… » et « Sujets liés »
const SHOWN = 4;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La marge d'un sujet, comme sur dev.to : la carte de son auteur (sa bio, d'où il écrit, depuis quand il est là, sa
 * réputation, « Suivre »), ses autres sujets, puis des sujets liés par le premier tag. Sous la discussion sur
 * tablette et téléphone.
 */
export default function TopicSidebar({ topic, className }: { topic: Question; className?: string }) {
  const { t } = useTranslation('forum');
  const firstTag = topic.tags[0];
  const byAuthor = useQuestions({ author: topic.author.username, sort: 'score,desc', size: SHOWN + 1 });
  const related = useQuestions({ tag: firstTag?.slug, sort: 'hotness,desc', size: SHOWN + 1 }, { enabled: firstTag !== undefined });
  const others = (list: QuestionSummary[] | undefined) => list?.filter((item) => item.id !== topic.id).slice(0, SHOWN);
  const fromAuthor = others(byAuthor.data?.content);
  const fromTag = others(related.data?.content)?.filter((item) => !fromAuthor?.some((own) => own.id === item.id));

  return (
    <aside aria-label={t('sidebar.label')} className={cn('flex flex-col gap-4', className)}>
      <AuthorCard username={topic.author.username} fallbackName={topic.author.fullName} />
      {fromAuthor && fromAuthor.length > 0 && (
        <TopicBox title={t('sidebar.moreFrom', { name: topic.author.fullName.split(/\s+/)[0] })} topics={fromAuthor} />
      )}
      {firstTag && fromTag && fromTag.length > 0 && (
        <TopicBox
          title={
            <>
              {t('sidebar.related')}{' '}
              <span style={tagAccent(firstTag.slug)} className="font-mono text-(--tag-accent)">
                #{firstTag.name}
              </span>
            </>
          }
          topics={fromTag}
        />
      )}
    </aside>
  );
}

/** La carte de l'auteur, comme celle de dev.to : une lisière kente, l'avatar qui la chevauche, puis ce qu'il est. */
function AuthorCard({ username, fallbackName }: { username: string; fallbackName: string }) {
  const { t } = useTranslation('forum');
  const { t: tc } = useTranslation();
  const { user } = useAuth();
  const memberAction = useMemberAction();
  const { data: profile, isPending } = useUserProfile(username);
  const follow = useFollowUser();
  const self = user?.username === username;
  const following = profile?.followedByMe === true;

  return (
    <section aria-label={t('sidebar.author')} className="glass overflow-hidden rounded-2xl">
      {/* La lisière : le dégradé kente, et ses fils tissés par-dessus */}
      <span aria-hidden className="block h-12 bg-kente">
        <span className="kente-stripes block size-full" />
      </span>
      <div className="-mt-6 px-4 pb-4">
        {/* L'avatar chevauche la lisière ; le nom vient dessous */}
        <div className="flex flex-col items-start gap-2">
          <Link to={paths.profile(username)} viewTransition tabIndex={-1} aria-hidden className="shrink-0 rounded-full ring-4 ring-surface">
            {profile ? <UserAvatar user={profile} size="lg" /> : <span className="block size-12 rounded-full skeleton-shimmer" />}
          </Link>
          <div className="w-full min-w-0">
            <Link
              to={paths.profile(username)}
              viewTransition
              onPointerEnter={() => prefetch(pages.profile)}
              dir="auto"
              className={cn('block truncate rounded-sm font-display text-h5 hover:underline', focusRing)}
            >
              {profile?.fullName ?? fallbackName}
            </Link>
            <p className="truncate font-mono text-xs text-muted-foreground">@{username}</p>
          </div>
        </div>

        {self ? (
          <Link
            to={paths.settings}
            viewTransition
            className={cn('mt-4 flex h-10 items-center justify-center rounded-xl border border-border-strong text-sm font-bold text-foreground transition-colors hover:bg-foreground/5', focusRing)}
          >
            {t('sidebar.editProfile')}
          </Link>
        ) : (
          <button
            type="button"
            aria-pressed={following}
            disabled={isPending || follow.isPending}
            onClick={() => memberAction('follow', () => follow.mutate({ username, follow: !following }))}
            className={cn(
              'mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-[background-color,color,translate,border-color] disabled:opacity-60',
              following
                ? 'border border-border-strong text-soft-foreground hover:border-coral/40 hover:text-coral'
                : 'bg-kente-warm text-kente-night hover:-translate-y-px',
              focusRing,
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            {follow.isPending ? (
              <PulsatingDots size="sm" tone="current" />
            ) : following ? (
              <>
                <Check aria-hidden className="size-4" strokeWidth={3} />
                {t('sidebar.following')}
              </>
            ) : (
              <>
                <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                {t('sidebar.follow')}
              </>
            )}
          </button>
        )}

        {profile?.bio && (
          <p dir="auto" className="mt-4 line-clamp-4 text-sm leading-relaxed text-soft-foreground">
            {profile.bio}
          </p>
        )}

        {profile ? (
          <dl className="mt-4 flex flex-col gap-2.5 text-[0.8125rem]">
            {profile.country && (
              <Detail icon={<MapPin className="size-3.5" />} label={t('sidebar.location')}>
                {countryFlag(profile.country)} {[profile.city, countryName(profile.country)].filter(Boolean).join(', ')}
              </Detail>
            )}
            {profile.level && (
              <Detail icon={<Sparkles className="size-3.5" />} label={t('sidebar.level')}>
                {tc(`enums.experienceLevel.${profile.level}`)}
                {profile.openToWork && <span className="ms-2 text-jade">· {t('sidebar.openToWork')}</span>}
              </Detail>
            )}
            <Detail icon={<Award className="size-3.5" />} label={t('sidebar.reputation')}>
              <span className="font-mono">{formatCount(profile.reputation)}</span>
              <span className="text-muted-foreground">
                {' · '}
                {t('sidebar.topics', { count: profile.questionCount })} · {t('sidebar.answers', { count: profile.answerCount })}
              </span>
            </Detail>
            <Detail icon={<CalendarDays className="size-3.5" />} label={t('sidebar.joined')}>
              {formatMonth(profile.createdAt)}
            </Detail>
          </dl>
        ) : (
          <div aria-hidden className="mt-4 flex flex-col gap-2">
            <span className="h-3 w-full rounded-full skeleton-shimmer" />
            <span className="h-3 w-3/4 rounded-full skeleton-shimmer" />
            <span className="h-3 w-1/2 rounded-full skeleton-shimmer" />
          </div>
        )}
      </div>
    </section>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 eyebrow">
        <span aria-hidden className="text-faint-foreground">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 text-soft-foreground">{children}</dd>
    </div>
  );
}

function TopicBox({ title, topics }: { title: ReactNode; topics: QuestionSummary[] }) {
  return (
    <section className="glass overflow-hidden rounded-2xl">
      <h2 className="border-b border-border-subtle px-4 py-3 font-sans text-sm font-bold text-foreground">{title}</h2>
      <ul>
        {topics.map((item) => (
          <li key={item.id} className="border-b border-border-subtle last:border-0">
            <Link
              to={paths.topic(item.slug)}
              viewTransition
              onPointerEnter={() => prefetch(pages.topic)}
              className={cn('group/more block px-4 py-3 transition-colors hover:bg-foreground/4', focusRing, 'focus-visible:ring-inset')}
            >
              <span dir="auto" className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold text-foreground group-hover/more:text-gold">
                {item.title}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-2 font-mono text-[0.6875rem] text-muted-foreground">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag.slug} style={tagAccent(tag.slug)}>
                    <span className="text-(--tag-accent)">#</span>
                    {tag.name}
                  </span>
                ))}
                <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
