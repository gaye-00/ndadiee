import { ArrowRight, Check } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { cn } from '@/lib/utils';

interface AuthSubmitProps {
  label: string;
  /** Pendant la requête : « Connexion… » */
  pendingLabel: string;
  /** Session ouverte : « Bienvenue ! » */
  doneLabel: string;
  state: 'idle' | 'pending' | 'done';
}

/**
 * Bouton d'envoi des formulaires de connexion et d'inscription, en or : une navette fait l'aller-retour
 * dedans pendant la requête, puis une coche quand la session s'ouvre. Sa taille ne bouge pas. Ce qui se
 * passe est dit aux lecteurs d'écran à côté du bouton, pas dans son nom.
 */
export default function AuthSubmit({ label, pendingLabel, doneLabel, state }: AuthSubmitProps) {
  const text = state === 'pending' ? pendingLabel : state === 'done' ? doneLabel : label;

  return (
    <>
      <button
        type="submit"
        aria-disabled={state !== 'idle' || undefined}
        className={cn(
          'group/submit relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[0.9375rem] font-bold text-kente-night',
          'shadow-[0_14px_34px_-20px_var(--kente-gold)] transition-[scale,box-shadow,background-color] duration-300 outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          state === 'done' ? 'bg-kente-jade' : 'bg-kente-gold hover:shadow-[0_18px_40px_-18px_var(--kente-gold)] active:scale-[0.99]',
        )}
      >
        {/* La navette : un éclat qui va et vient pendant la requête */}
        {state === 'pending' && <span aria-hidden className="auth-submit-shuttle pointer-events-none absolute inset-y-0 w-1/4" />}
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative inline-flex items-center gap-2"
          >
            {state === 'done' && <Check aria-hidden className="size-4.5" strokeWidth={3} />}
            {text}
            {state === 'idle' && (
              <ArrowRight
                aria-hidden
                className="size-4.5 transition-transform duration-300 group-hover/submit:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/submit:-translate-x-0.5"
              />
            )}
          </m.span>
        </AnimatePresence>
      </button>
      <span aria-live="polite" className="sr-only">
        {state !== 'idle' ? text : ''}
      </span>
    </>
  );
}
