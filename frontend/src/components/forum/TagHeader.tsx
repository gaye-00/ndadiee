import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tagAccent } from './forumUtils';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useMemberAction } from '@/hooks/useMemberAction';
import { useFollowTag, useTag } from '@/hooks/useTags';
import { cn } from '@/lib/utils';

/**
 * En tête du fil filtré sur un tag, comme la page d'un tag sur dev.to : sa couleur en lisière, son nom, sa
 * description, et « Suivre » : ses sujets entrent dans le fil du membre (« Mon fil »).
 */
export default function TagHeader({ slug }: { slug: string }) {
  const { t } = useTranslation('forum');
  const { data: tag, isPending } = useTag(slug);
  const follow = useFollowTag();
  const qc = useQueryClient();
  const memberAction = useMemberAction();
  const following = tag?.followedByMe === true;
  const name = tag?.name ?? slug;

  return (
    <div style={tagAccent(slug)} className="glass relative mb-4 overflow-hidden rounded-2xl p-4 sm:p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-(--tag-accent) opacity-80" />
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--tag-accent)_12%,transparent)] font-mono text-2xl font-bold text-(--tag-accent)"
        >
          #
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h4">{isPending ? <span className="inline-block h-6 w-32 rounded-full align-middle skeleton-shimmer" /> : name}</h2>
          {tag?.description && <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">{tag.description}</p>}
        </div>
        <button
          type="button"
          aria-pressed={following}
          disabled={follow.isPending || isPending}
          onClick={() =>
            memberAction('follow', () =>
              // « Mon fil » change avec les tags suivis
              follow.mutate({ slug, follow: !following }, { onSuccess: () => void qc.invalidateQueries({ queryKey: ['questions', 'board'] }) }),
            )
          }
          className={cn(
            'inline-flex h-10 min-w-28 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-[background-color,border-color,color,translate] duration-200 disabled:opacity-60',
            following
              ? 'border border-border-strong text-soft-foreground hover:border-coral/40 hover:text-coral'
              : 'bg-foreground text-background hover:-translate-y-px',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {follow.isPending ? (
            <PulsatingDots size="sm" tone="current" />
          ) : following ? (
            <>
              <Check aria-hidden className="size-4" strokeWidth={3} />
              {t('tag.following')}
            </>
          ) : (
            <>
              <Plus aria-hidden className="size-4" strokeWidth={2.5} />
              {t('tag.follow')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
