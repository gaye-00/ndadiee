import { MessageSquare, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BookmarkButton from './BookmarkButton';
import ShareMenu from './ShareMenu';
import VoteControl from './VoteControl';
import { useAuth } from '@/hooks/useAuth';
import { useForumVote } from '@/hooks/useQuestions';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Question } from '@/types/question.types';
import { formatCount } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface TopicActionsProps {
  topic: Question;
  /** rail : la colonne qui suit la lecture sur grand écran (dev.to) ; bar : la rangée sous le sujet, sur téléphone */
  variant: 'rail' | 'bar';
  className?: string;
}

/**
 * Ce qu'on fait d'un sujet, comme le rail de dev.to : voter, aller aux réponses, l'enregistrer, le partager. Sur grand
 * écran, une colonne qui reste à côté du texte pendant la lecture ; sur téléphone, une rangée sous le sujet.
 */
export default function TopicActions({ topic, variant, className }: TopicActionsProps) {
  const { t } = useTranslation('forum');
  const { user } = useAuth();
  const vote = useForumVote(topic);
  const reduced = useReducedMotion();
  const rail = variant === 'rail';
  const url = `${window.location.origin}${paths.topic(topic.slug)}`;

  const toAnswers = () => {
    document.getElementById('answers')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', '#answers');
  };

  const actionClass = cn(
    'inline-flex items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-foreground',
    rail ? 'size-11 rounded-2xl hover:bg-foreground/6' : 'h-10 gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-foreground/6',
    focusRing,
  );

  return (
    <div
      role="toolbar"
      aria-label={t('topic.actions')}
      aria-orientation={rail ? 'vertical' : 'horizontal'}
      className={cn(rail ? 'flex-col items-center gap-3' : 'flex flex-wrap items-center gap-1', className)}
    >
      <VoteControl
        score={topic.score}
        vote={topic.currentUserVote}
        own={topic.author.id === user?.id}
        onVote={(value) => vote.mutate({ targetType: 'QUESTION', targetId: topic.id, value })}
        orientation={rail ? 'vertical' : 'horizontal'}
        target="topic"
      />
      {rail && <span aria-hidden className="h-px w-6 bg-border" />}
      <button type="button" onClick={toAnswers} aria-label={t('topic.toAnswers', { count: topic.answerCount })} className={cn(actionClass, rail && 'h-auto flex-col gap-0.5 py-1.5')}>
        <MessageSquare aria-hidden className={rail ? 'size-5.5' : 'size-4.5'} />
        <span aria-hidden className={cn('font-mono tabular-nums', rail ? 'text-xs' : 'text-sm')}>
          {formatCount(topic.answerCount)}
        </span>
      </button>
      <BookmarkButton topic={topic} variant={rail ? 'md' : 'bar'} />
      <ShareMenu url={url} title={topic.title} triggerLabel={t('share.title')} triggerClassName={actionClass} side={rail ? 'right' : 'top'}>
        <Share2 aria-hidden className={rail ? 'size-5' : 'size-4.5'} />
        {/* Sur un écran étroit, l'icône seule : la rangée tient sur une ligne */}
        {!rail && <span className="hidden sm:inline">{t('share.short')}</span>}
      </ShareMenu>
    </div>
  );
}
