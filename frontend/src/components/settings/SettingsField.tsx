import { LockKeyhole, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Marges de défilement d'un champ : atteint au clavier, il s'arrête sous la barre du haut et les onglets, au-dessus
 * de la barre d'enregistrement
 */
export const settingsScrollMargins = 'scroll-mt-36 scroll-mb-28 lg:scroll-mt-24';

/** Le champ lui-même, sans bordure : c'est son cadre qui la porte */
export const settingsInputClass = `h-12 w-full min-w-0 bg-transparent px-4 text-[0.9375rem] text-foreground outline-none placeholder:text-faint-foreground/80 disabled:cursor-not-allowed read-only:cursor-default ${settingsScrollMargins}`;

interface ControlProps {
  id: string;
  'aria-describedby'?: string;
}

interface SettingsFieldProps {
  label: string;
  icon?: LucideIcon | ((props: { className?: string }) => ReactNode);
  /** À droite du libellé : un compteur */
  aside?: ReactNode;
  hint?: ReactNode;
  /** Message montré quand le navigateur refuse la saisie (adresse mal formée), à la sortie du champ */
  invalidHint?: string;
  /** Lié à la connexion : se lit, ne se modifie pas ici */
  locked?: boolean;
  /** Un champ de plusieurs lignes : l'icône reste en haut */
  multiline?: boolean;
  /**
   * Ce qu'on y tape s'écrit en caractères latins (e-mail, nom d'utilisateur, adresse) : le cadre va de gauche à
   * droite, même en arabe, l'icône collée au texte
   */
  latin?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

/**
 * Un champ du profil : libellé, cadre avec icône, aide reliée pour les lecteurs d'écran. Au focus, l'icône
 * prend l'or et un fil kente se tisse sous le cadre, d'un bord à l'autre (en arabe, de droite à gauche).
 * Un champ verrouillé a un cadre en pointillés et le dit à côté de son libellé.
 */
export default function SettingsField({
  label,
  icon: Icon,
  aside,
  hint,
  invalidHint,
  locked = false,
  multiline = false,
  latin = false,
  className,
  children,
}: SettingsFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const lockId = `${id}-lock`;
  const describedBy = [locked && lockId, (hint || invalidHint) && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('group/field min-w-0', className)}>
      <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {locked ? (
          <span id={lockId} className="inline-flex items-center gap-1 text-xs font-medium text-faint-foreground">
            <LockKeyhole aria-hidden className="size-3" />
            {t('settingsPage.locked')}
          </span>
        ) : (
          aside
        )}
      </div>

      <div
        data-settings-frame
        dir={latin ? 'ltr' : undefined}
        className={cn(
          'relative flex rounded-[0.875rem] border transition-[border-color,box-shadow,background-color] duration-300',
          multiline ? 'items-start' : 'items-center',
          locked
            ? 'border-dashed border-border-strong bg-foreground/[0.025]'
            : cn(
                'border-input bg-surface/60 hover:border-border-strong',
                'focus-within:border-gold/60 focus-within:bg-surface focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_14%,transparent)]',
                'has-[:user-invalid]:border-coral/60 has-[:user-invalid]:focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--coral)_14%,transparent)]',
                'has-[:disabled]:opacity-60',
              ),
        )}
      >
        {Icon && (
          <span
            aria-hidden
            className={cn(
              'flex shrink-0 ps-4 text-faint-foreground transition-colors duration-300',
              multiline && 'pt-3.5',
              !locked && 'group-focus-within/field:text-gold group-has-[:user-invalid]/field:text-coral',
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
        {children({ id, 'aria-describedby': describedBy })}
        {!locked && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-kente transition-transform duration-500 ease-out-expo group-focus-within/field:scale-x-100 group-has-[:user-invalid]/field:bg-coral rtl:origin-right"
          />
        )}
      </div>

      {(hint || invalidHint) && (
        <p
          id={hintId}
          className={cn('mt-2 text-xs leading-relaxed text-muted-foreground', !hint && 'hidden group-has-[:user-invalid]/field:block')}
        >
          {invalidHint ? (
            <>
              <span className="group-has-[:user-invalid]/field:hidden">{hint}</span>
              <span className="hidden text-coral group-has-[:user-invalid]/field:inline">{invalidHint}</span>
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
}
