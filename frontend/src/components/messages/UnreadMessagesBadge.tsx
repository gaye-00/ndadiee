import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';

/** Pastille de la messagerie dans la navigation : les conversations où un message attend d'être lu. */
export default function UnreadMessagesBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data: count = 0 } = useUnreadMessageCount();

  return (
    <AnimatePresence initial={false}>
      {count > 0 && (
        <m.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22 }}
          className={cn(
            'pointer-events-none absolute grid h-4.5 min-w-4.5 place-items-center rounded-full bg-kente-coral px-1 font-mono text-[0.625rem] leading-none font-bold text-white ring-2 ring-background',
            className,
          )}
        >
          <span aria-hidden>{count > 9 ? '9+' : count}</span>
          <span className="sr-only">{t('shell.messages.unread', { count })}</span>
        </m.span>
      )}
    </AnimatePresence>
  );
}
