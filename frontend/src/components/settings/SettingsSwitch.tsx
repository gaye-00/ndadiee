import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSwitchProps {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  /** Teinte allumée */
  tone?: 'jade' | 'gold';
}

const ON = {
  jade: 'bg-jade shadow-[0_6px_18px_-6px_var(--jade)]',
  gold: 'bg-gold shadow-[0_6px_18px_-6px_var(--gold)]',
} as const;

/**
 * Interrupteur accessible, partagé entre les préférences immédiates et le profil. La pastille glisse avec
 * un léger rebond et s'étire sous le doigt, comme un interrupteur de téléphone ; allumée, elle porte une coche.
 */
export default function SettingsSwitch({ checked, label, onCheckedChange, tone = 'jade' }: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group/switch relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 outline-none transition-[background-color,box-shadow] duration-300',
        'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50',
        checked ? ON[tone] : 'bg-foreground/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] hover:bg-foreground/22',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)]',
          'transition-[translate,width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active/switch:w-6',
          checked && 'translate-x-5 group-active/switch:translate-x-4 rtl:-translate-x-5 rtl:group-active/switch:-translate-x-4',
        )}
      >
        <Check
          strokeWidth={3.5}
          className={cn(
            'size-3 transition-[opacity,scale] duration-300',
            tone === 'jade' ? 'text-jade' : 'text-gold',
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      </span>
    </button>
  );
}
