import { ArrowRight, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useForumOverview } from '@/hooks/useQuestions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useSignInGateStore, type SignInReason } from '@/store/useSignInGateStore';
import { formatCount } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

/**
 * « Connecte-toi pour continuer », comme sur dev.to : ce que le visiteur voulait faire, puis la connexion ou
 * l'inscription. Il revient ensuite sur la page qu'il quittait, à l'endroit où il était (l'ancre des réponses
 * pour répondre). Une seule fenêtre pour tout le forum, posée par ses pages. Feuille en bas de l'écran sur
 * téléphone.
 */
export default function SignInDialog() {
  const { t } = useTranslation('forum');
  const reason = useSignInGateStore((s) => s.reason);
  const hash = useSignInGateStore((s) => s.hash);
  const close = useSignInGateStore((s) => s.close);
  const location = useLocation();
  const { data: overview } = useForumOverview();
  // La raison reste affichée le temps que la fenêtre se ferme
  const [shown, setShown] = useState<SignInReason>('ask');
  if (reason !== null && reason !== shown) {
    setShown(reason);
  }
  const from = { ...location, hash: hash ?? location.hash };

  return (
    <Dialog.Root open={reason !== null} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(27rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {/* Une lisière tissée en tête de la fenêtre */}
          <span aria-hidden className="block h-1.5 bg-kente" />
          <div className="relative p-6 sm:p-7">
            <span aria-hidden className="mx-auto -mt-3 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
            <Dialog.Close
              aria-label={t('signIn.close')}
              className="absolute end-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <X aria-hidden className="size-4.5" />
            </Dialog.Close>

            <span aria-hidden className="block size-11 rounded-[0.875rem] bg-kente-conic shadow-[0_10px_26px_-12px_var(--kente-coral)]" />
            <Dialog.Title className="mt-5 font-display text-h4">{t('signIn.title')}</Dialog.Title>
            <Dialog.Description className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {t(`signIn.reasons.${shown}`)}
            </Dialog.Description>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to={paths.login}
                state={{ from }}
                onClick={close}
                onPointerEnter={() => prefetch(pages.login)}
                className={cn(
                  'group/sign-in inline-flex h-12 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
                  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 hover:-translate-y-px',
                  focusRing,
                )}
              >
                {t('signIn.login')}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover/sign-in:translate-x-0.5 rtl:-scale-x-100" />
              </Link>
              <Link
                to={paths.register}
                state={{ from }}
                onClick={close}
                onPointerEnter={() => prefetch(pages.register)}
                className={cn(
                  'inline-flex h-12 items-center justify-center rounded-[0.875rem] border border-border-strong px-5 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5',
                  focusRing,
                )}
              >
                {t('signIn.register')}
              </Link>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {overview && overview.contributors > 0
                ? t('signIn.community', { count: overview.contributors, formatted: formatCount(overview.contributors) })
                : t('signIn.free')}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
