import { Bookmark } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { forumSearch } from '@/hooks/useForumFilters';
import { useMemberAction } from '@/hooks/useMemberAction';
import { useBookmark } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

interface BookmarkButtonProps {
  topic: { id: number; slug?: string; bookmarkedByMe: boolean | null };
  /** sm : sur une carte ; md : dans le rail d'un sujet, avec son nom dessous ; bar : la barre d'actions du téléphone */
  variant?: 'sm' | 'md' | 'bar';
  className?: string;
}

/**
 * Enregistrer un sujet pour y revenir (sa liste de lecture), comme le marque-page de dev.to. Le marque-page se
 * remplit tout de suite ; une notification permet d'ouvrir la liste, ou d'annuler un retrait. Un visiteur est
 * invité à se connecter.
 */
export default function BookmarkButton({ topic, variant = 'sm', className }: BookmarkButtonProps) {
  const { t } = useTranslation('forum');
  const navigate = useNavigate();
  const memberAction = useMemberAction();
  const bookmark = useBookmark();
  const saved = topic.bookmarkedByMe === true;
  const label = t(saved ? 'bookmark.saved' : 'bookmark.save');

  function toggle(next: boolean) {
    bookmark.mutate(
      { id: topic.id, slug: topic.slug, bookmarked: next },
      {
        onSuccess: () => {
          if (next) {
            toast.success(t('bookmark.savedToast'), {
              action: { label: t('bookmark.open'), onClick: () => void navigate(`${paths.forum}${forumSearch({ view: 'saved' })}`) },
            });
          } else {
            toast(t('bookmark.removedToast'), { action: { label: t('bookmark.undo'), onClick: () => toggle(true) } });
          }
        },
      },
    );
  }

  const icon = (
    <m.span
      key={String(saved)}
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 18 }}
      className="grid place-items-center"
    >
      <Bookmark aria-hidden className={cn(variant === 'md' ? 'size-5.5' : 'size-4.5', saved && 'fill-current')} strokeWidth={saved ? 2.25 : 2} />
    </m.span>
  );

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={variant === 'bar' ? undefined : label}
      title={label}
      onClick={() => memberAction('save', () => toggle(!saved))}
      className={cn(
        'relative z-10 inline-flex items-center justify-center transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        variant === 'sm' && 'size-9 rounded-xl',
        variant === 'md' && 'size-11 rounded-2xl',
        variant === 'bar' && 'h-10 gap-2 rounded-xl px-3 text-sm font-semibold',
        saved ? 'bg-gold/12 text-gold' : 'text-muted-foreground hover:bg-gold/10 hover:text-gold',
        className,
      )}
    >
      {icon}
      {variant === 'bar' && <span>{label}</span>}
    </button>
  );
}
