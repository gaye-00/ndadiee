import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMemberAction } from '@/hooks/useMemberAction';
import { cn } from '@/lib/utils';
import { formatCount } from '@/utils/formatters';

interface VoteControlProps {
  score: number;
  /** Le vote du membre connecté : +1, -1, ou null */
  vote: number | null;
  /** Le contenu est celui du membre : il ne vote pas pour lui-même */
  own: boolean;
  onVote: (value: 1 | -1 | 0) => void;
  /** vertical : le rail d'un sujet ; horizontal : sous une réponse, la barre du téléphone */
  orientation?: 'vertical' | 'horizontal';
  /** Le sujet ou la réponse, pour les lecteurs d'écran */
  target: 'topic' | 'answer';
  className?: string;
}

/**
 * Voter pour un sujet ou une réponse : utile (+1) ou pas utile (-1) ; voter à nouveau la même chose retire son vote.
 * Le score change tout de suite (hooks/useQuestions, useForumVote) et défile d'un cran. Un visiteur est invité à se
 * connecter ; son propre contenu ne se vote pas, le bouton le dit.
 */
export default function VoteControl({ score, vote, own, onVote, orientation = 'vertical', target, className }: VoteControlProps) {
  const { t } = useTranslation('forum');
  const memberAction = useMemberAction();
  const vertical = orientation === 'vertical';
  const ownHint = own ? t(`vote.own.${target}`) : undefined;

  const cast = (value: 1 | -1) => memberAction('vote', () => onVote(vote === value ? 0 : value));

  const button = (value: 1 | -1) => {
    const active = vote === value;
    const Icon = value === 1 ? ArrowBigUp : ArrowBigDown;
    const label = t(value === 1 ? `vote.up.${target}` : `vote.down.${target}`);
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        title={ownHint ?? label}
        disabled={own}
        onClick={() => cast(value)}
        className={cn(
          'grid place-items-center transition-[background-color,color,scale] duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
          vertical ? 'size-10 rounded-xl' : 'size-8 rounded-lg',
          active
            ? value === 1
              ? 'bg-gold/14 text-gold'
              : 'bg-coral/12 text-coral'
            : cn('text-muted-foreground enabled:hover:text-foreground', value === 1 ? 'enabled:hover:bg-gold/10' : 'enabled:hover:bg-coral/10'),
          'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        )}
      >
        <Icon aria-hidden className={cn(vertical ? 'size-6' : 'size-5', active && 'fill-current')} strokeWidth={active ? 2 : 1.75} />
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t(`vote.group.${target}`)}
      className={cn('flex items-center', vertical ? 'flex-col gap-0.5' : 'gap-0.5', className)}
    >
      {button(1)}
      <span
        aria-live="polite"
        className={cn(
          'relative grid overflow-hidden text-center font-mono font-bold tabular-nums',
          vertical ? 'h-6 min-w-10 text-[0.9375rem]' : 'h-6 min-w-7 text-sm',
          vote === 1 ? 'text-gold' : vote === -1 ? 'text-coral' : 'text-foreground',
        )}
      >
        {/* Le score défile d'un cran quand il change */}
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={score}
            aria-hidden
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="col-start-1 row-start-1 leading-6"
          >
            {formatCount(score)}
          </m.span>
        </AnimatePresence>
        <span className="sr-only">{t('vote.score', { count: score })}</span>
      </span>
      {button(-1)}
    </div>
  );
}
