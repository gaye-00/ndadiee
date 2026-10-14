import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useVote } from '@/hooks/useVotes';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types/common.types';

interface VoteButtonsProps {
  targetType: ContentType;
  targetId: number;
  score: number;
  /** Vote du membre connecté : +1, -1 ou null */
  currentUserVote: number | null;
  /** Auteur du contenu : on ne vote pas pour soi-même */
  authorId: number;
  orientation?: 'vertical' | 'horizontal';
}

/** Flèches de vote et score. Recliquer sur son vote le retire. */
export default function VoteButtons({
  targetType,
  targetId,
  score,
  currentUserVote,
  authorId,
  orientation = 'vertical',
}: VoteButtonsProps) {
  const { isAuthenticated, user } = useAuth();
  const vote = useVote();
  const isOwnContent = user?.id === authorId;

  const cast = (value: 1 | -1) => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour voter');
      return;
    }
    vote.mutate({ targetType, targetId, value: currentUserVote === value ? 0 : value });
  };

  const disabled = vote.isPending || isOwnContent;
  const hint = isOwnContent ? 'Vous ne pouvez pas voter pour votre propre contenu' : undefined;

  return (
    <div
      className={cn('flex items-center gap-1', orientation === 'vertical' ? 'flex-col' : 'flex-row')}
      title={hint}
    >
      <Button
        variant={currentUserVote === 1 ? 'default' : 'outline'}
        size="icon-sm"
        onClick={() => cast(1)}
        disabled={disabled}
        aria-label="Voter pour"
        aria-pressed={currentUserVote === 1}
      >
        <ChevronUp />
      </Button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-label={`Score : ${score}`}>
        {score}
      </span>
      <Button
        variant={currentUserVote === -1 ? 'default' : 'outline'}
        size="icon-sm"
        onClick={() => cast(-1)}
        disabled={disabled}
        aria-label="Voter contre"
        aria-pressed={currentUserVote === -1}
      >
        <ChevronDown />
      </Button>
    </div>
  );
}
