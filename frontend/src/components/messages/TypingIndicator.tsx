import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** Trois points qui ondulent l'un après l'autre. */
function Dots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex items-center gap-[3px]', className)}>
      {[0, 1, 2].map((index) => (
        <m.span
          key={index}
          className="size-1.5 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: index * 0.16 }}
        />
      ))}
    </span>
  );
}

/** La bulle « en train d'écrire », au bas du fil. */
export function TypingBubble({ name }: { name: string }) {
  const { t } = useTranslation('messages');
  return (
    <m.li
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96, transition: { duration: 0.15 } }}
      style={{ transformOrigin: 'bottom left' }}
      className="mt-3 flex"
    >
      <span role="status" className="inline-flex h-10 items-center rounded-[1.25rem] rounded-es-md bg-surface-raised px-4 text-muted-foreground ring-1 ring-border-subtle">
        <Dots />
        <span className="sr-only">{t('thread.typingLabel', { name })}</span>
      </span>
    </m.li>
  );
}

/** « écrit… » en ligne, dans la liste des conversations et l'en-tête du fil. */
export function TypingText({ className }: { className?: string }) {
  const { t } = useTranslation('messages');
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold text-jade', className)}>
      <Dots className="[&>span]:size-1" />
      {t('thread.typing')}
    </span>
  );
}
