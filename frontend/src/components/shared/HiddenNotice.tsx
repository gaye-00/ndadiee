import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ModeratedContent } from '@/types/admin.types';

interface HiddenNoticeProps {
  /** Sujet, réponse ou projet */
  kind: ModeratedContent;
  reason: string | null;
  className?: string;
}

/**
 * Un contenu masqué par l'équipe, tel que le voient encore son auteur et les admins : le public, lui, ne le voit
 * plus. Le motif de la décision l'accompagne.
 */
export default function HiddenNotice({ kind, reason, className }: HiddenNoticeProps) {
  const { t } = useTranslation();

  return (
    <div role="note" className={cn('flex gap-3 rounded-2xl border border-coral/25 bg-coral/8 p-3.5 text-sm', className)}>
      <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0 text-coral" />
      <p className="leading-relaxed text-soft-foreground">
        <strong className="font-semibold text-foreground">{t(`moderation.hidden.${kind}`)}</strong>
        {reason && <span className="mt-0.5 block text-muted-foreground">{t('moderation.reason', { reason })}</span>}
      </p>
    </div>
  );
}
