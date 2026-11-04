import { MessagesSquare, SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** À droite de la liste, tant qu'aucune conversation n'est ouverte (tablette et ordinateur). */
export default function EmptyThread({ onNewMessage, className }: { onNewMessage: () => void; className?: string }) {
  const { t } = useTranslation('messages');

  return (
    <div className={cn('relative isolate flex-col items-center justify-center gap-5 overflow-hidden p-10 text-center', className)}>
      <div aria-hidden className="halo halo-gold top-1/2 left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <div aria-hidden className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 rotate-6 rounded-[1.75rem] bg-kente-conic opacity-90 animate-spin-slow [animation-duration:24s]" />
        <span className="absolute inset-[3px] rounded-[1.6rem] bg-background" />
        <MessagesSquare className="relative size-8 text-gold" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-display text-h4">{t('empty.title')}</h2>
        <p className="max-w-sm text-[0.9375rem] leading-relaxed text-muted-foreground">{t('empty.description')}</p>
      </div>
      <button
        type="button"
        onClick={onNewMessage}
        className="group/new inline-flex h-11 items-center gap-2 rounded-[0.875rem] bg-kente-warm px-4 text-sm font-bold text-kente-night shadow-[0_10px_24px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 ease-out-expo outline-none hover:-translate-y-px hover:shadow-[0_14px_30px_-12px_var(--kente-coral)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SquarePen aria-hidden className="size-4 transition-transform duration-300 group-hover/new:-rotate-6" strokeWidth={2.25} />
        {t('empty.action')}
      </button>
    </div>
  );
}
