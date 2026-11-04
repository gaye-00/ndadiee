import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SettingsTone = 'gold' | 'coral' | 'jade';

const TONES: Record<SettingsTone, string> = {
  gold: 'bg-gold/12 text-gold ring-gold/20',
  coral: 'bg-coral/12 text-coral ring-coral/20',
  jade: 'bg-jade/12 text-jade ring-jade/20',
};

interface SettingsSectionProps {
  /** Nom de la section (account), qui fait l'identifiant de son titre */
  id: string;
  tone: SettingsTone;
  icon: LucideIcon;
  title: string;
  description: string;
  /** À droite du titre : un lien, une action */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Une carte de la page des réglages : pastille teintée, titre, description. Tant qu'on y remplit un champ,
 * un fil kente se tisse sur son bord haut et la pastille penche.
 */
export default function SettingsSection({ id, tone, icon: Icon, title, description, action, children }: SettingsSectionProps) {
  const titleId = `settings-${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className="group/section relative rounded-[1.375rem] border border-border-subtle bg-card shadow-sm transition-[border-color,box-shadow] duration-500 focus-within:border-border focus-within:shadow-float"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -top-px h-px origin-left scale-x-0 bg-kente transition-transform duration-700 ease-out-expo group-focus-within/section:scale-x-100 rtl:origin-right"
      />

      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border-subtle px-5 py-5 sm:px-7">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-[0.875rem] ring-1 ring-inset',
            'transition-transform duration-500 ease-out-expo group-hover/section:-rotate-6 group-focus-within/section:-rotate-6',
            TONES[tone],
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1 basis-36">
          <h2 id={titleId} className="font-display text-[1.0625rem] font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        </div>
        {action}
      </header>

      {children}
    </section>
  );
}
