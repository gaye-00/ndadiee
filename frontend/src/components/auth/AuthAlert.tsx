import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';

/**
 * Le message au-dessus d'un formulaire de compte : un refus (rouge, annoncé tout de suite aux lecteurs d'écran) ou une
 * bonne nouvelle (vert). Il s'ouvre et se referme en hauteur.
 */
export default function AuthAlert({ failure, notice }: { failure: string | null; notice?: string | null }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {(failure || notice) && (
        <m.p
          key={failure ? 'failure' : 'notice'}
          role={failure ? 'alert' : 'status'}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          {failure ? (
            <span className="flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {failure}
            </span>
          ) : (
            <span className="flex items-start gap-2.5 rounded-xl border border-jade/30 bg-jade/8 px-3.5 py-3 text-sm text-soft-foreground">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-jade" />
              {notice}
            </span>
          )}
        </m.p>
      )}
    </AnimatePresence>
  );
}
