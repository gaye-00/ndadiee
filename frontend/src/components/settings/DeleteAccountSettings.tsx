import { ArrowRight, MailCheck, Trash2, UserX } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PasswordInput from './PasswordInput';
import SettingsSection from './SettingsSection';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { useDeletionPreview, useRequestDeletion, useSendDeletionCode } from '@/hooks/useAccount';
import { useAuth } from '@/hooks/useAuth';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { formatDate } from '@/utils/formatters';

// Le délai annoncé avant que la fenêtre ait chargé le vrai (AccountDeletionService.GRACE_PERIOD)
const GRACE_DAYS = 14;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';
const linkButton =
  'rounded-sm text-sm font-semibold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:text-faint-foreground disabled:no-underline';

/**
 * Supprimer son compte : ce qui part, ce qui reste, et le délai pour changer d'avis. Le bouton ouvre la confirmation,
 * qui demande le mot de passe (ou un code reçu par e-mail pour un compte GitHub ou Google). Réservé aux comptes
 * développeur : un compte d'administration se gère depuis le back-office.
 */
export default function DeleteAccountSettings() {
  const { t } = useTranslation();
  const { isDeveloper } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isDeveloper) {
    return null;
  }

  return (
    <SettingsSection
      id="delete-account"
      tone="coral"
      icon={UserX}
      title={t('settingsPage.deletion.title')}
      description={t('settingsPage.deletion.description', { count: GRACE_DAYS })}
    >
      <div id="delete-account-anchor" className="flex scroll-mt-28 flex-col gap-5 p-5 sm:p-7">
        <ul className="grid gap-2.5 text-sm leading-relaxed text-soft-foreground">
          {(['erased', 'kept', 'projects', 'grace'] as const).map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className={cn('mt-2 size-1.5 shrink-0 rounded-full', item === 'erased' ? 'bg-coral' : 'bg-faint-foreground')} />
              {t(`settingsPage.deletion.${item}`, { count: GRACE_DAYS })}
            </li>
          ))}
        </ul>
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-[0.875rem] border border-coral/40 px-4 text-sm font-bold text-coral',
              'transition-colors hover:bg-coral/8 outline-none focus-visible:ring-2 focus-visible:ring-coral/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            )}
          >
            <Trash2 aria-hidden className="size-4" />
            {t('settingsPage.deletion.open')}
          </button>
        </div>
      </div>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </SettingsSection>
  );
}

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** La confirmation : le sort de chaque projet porté, puis le mot de passe (ou le code). Feuille en bas sur téléphone. */
function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const request = useRequestDeletion();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !request.isPending && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover p-6 text-popover-foreground shadow-float outline-none',
            'pb-[calc(1.5rem+env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-6',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {open && <DeleteAccountContent request={request} onCancel={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteAccountContent({ request, onCancel }: { request: ReturnType<typeof useRequestDeletion>; onCancel: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const preview = useDeletionPreview(true);
  const sendCode = useSendDeletionCode();
  // Un compte sans mot de passe se confirme par un code ; un membre qui a oublié le sien aussi
  const [byCode, setByCode] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const wait = useCountdown(resendAt ?? 0);

  const data = preview.data;
  const withCode = byCode || (data !== undefined && !data.passwordRequired);
  const days = data?.gracePeriodDays ?? GRACE_DAYS;

  function askCode() {
    if (sendCode.isPending || wait > 0) {
      return;
    }
    setError(null);
    sendCode.mutate(undefined, {
      onSuccess: (pending) => setResendAt(Date.now() + pending.resendAvailableInSeconds * 1000),
      onError: (failure) => setError(getApiErrorMessage(failure)),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.isPending) {
      return;
    }
    if (withCode ? code.length !== 6 : !password) {
      setError(t(withCode ? 'validation.code' : 'validation.required'));
      return;
    }
    setError(null);
    request.mutate(withCode ? { code } : { password }, {
      onSuccess: ({ scheduledAt }) => {
        // La session est déjà close côté serveur : on la ferme ici aussi. La page de connexion suit, puisque s'y
        // reconnecter annule tout
        logout();
        void navigate(paths.login, { replace: true });
        toast.success(t('settingsPage.deletion.scheduled', { date: formatDate(scheduledAt) }), { duration: 12000 });
      },
      onError: (failure) => {
        const body = getApiError(failure);
        switch (body?.errorCode) {
          case 'PASSWORD_INCORRECT':
            setError(t('settingsPage.security.errors.incorrect'));
            setPassword('');
            break;
          case 'VERIFICATION_CODE_INVALID':
            setError(t('auth.verify.invalid', { count: Number(body.details?.remainingAttempts ?? 0) }));
            setCode('');
            break;
          case 'VERIFICATION_CODE_EXPIRED':
            setError(t('auth.verify.expired'));
            setCode('');
            break;
          case 'VERIFICATION_TOO_MANY_ATTEMPTS':
            setError(t('auth.verify.tooMany'));
            setCode('');
            break;
          default:
            setError(getApiErrorMessage(failure));
        }
      },
    });
  }

  return (
    <form noValidate onSubmit={submit}>
      <span aria-hidden className="grid size-11 place-items-center rounded-[0.875rem] bg-coral/12 text-coral ring-1 ring-inset ring-coral/20">
        <UserX className="size-5" />
      </span>
      <Dialog.Title className="mt-4 font-display text-h5">{t('settingsPage.deletion.dialogTitle')}</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('settingsPage.deletion.dialogText', { count: days })}
      </Dialog.Description>

      {/* Le sort de chaque projet porté */}
      {preview.isPending ? (
        <div className="mt-5 flex justify-center py-3">
          <PulsatingDots size="sm" label={t('states.loading')} />
        </div>
      ) : (
        data &&
        data.projects.length > 0 && (
          <div className="mt-5">
            <p className="eyebrow">{t('settingsPage.deletion.projectsTitle')}</p>
            <ul className="mt-2.5 grid gap-2">
              {data.projects.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-semibold">{project.name}</span>
                  <ArrowRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground rtl:-scale-x-100" />
                  {project.successor ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-soft-foreground">
                      <UserAvatar user={project.successor} size="sm" className="size-5 text-[0.5rem]" />
                      <span className="truncate">{t('settingsPage.deletion.handedOver', { name: project.successor.fullName })}</span>
                    </span>
                  ) : (
                    <span className="text-coral">{t('settingsPage.deletion.deletedWithAccount')}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {/* La preuve : le mot de passe, ou le code reçu par e-mail */}
      <div className="mt-5 flex flex-col gap-3">
        {withCode ? (
          resendAt === null ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle p-4">
              <p className="text-sm leading-relaxed text-soft-foreground">
                {t('settingsPage.deletion.codeIntro', { email: data?.email ?? '' })}
              </p>
              <button
                type="button"
                onClick={askCode}
                disabled={sendCode.isPending || !data}
                className={cn('inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-border-strong px-4 text-sm font-bold transition-colors hover:bg-foreground/5 disabled:opacity-60', focusRing)}
              >
                {sendCode.isPending ? <PulsatingDots size="sm" tone="current" /> : t('settingsPage.security.sendCode')}
              </button>
            </div>
          ) : (
            <>
              <p role="status" className="flex items-start gap-2.5 rounded-xl border border-jade/30 bg-jade/8 px-3.5 py-3 text-sm text-soft-foreground">
                <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-jade" />
                {t('settingsPage.security.codeSent', { email: data?.email ?? '' })}
              </p>
              <PasswordInput
                code
                label={t('auth.verify.code')}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                autoFocus
              />
              <button type="button" onClick={askCode} disabled={wait > 0 || sendCode.isPending} className={cn(linkButton, 'self-start')}>
                {wait > 0 ? t('auth.verify.resendIn', { seconds: wait }) : t('auth.verify.resend')}
              </button>
            </>
          )
        ) : (
          <>
            <PasswordInput
              label={t('settingsPage.deletion.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setByCode(true);
                setError(null);
              }}
              className={cn(linkButton, 'self-start')}
            >
              {t('settingsPage.deletion.noPassword')}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-2.5 text-sm text-coral">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={request.isPending}
          className={cn('inline-flex h-11 items-center justify-center rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold transition-colors hover:bg-foreground/5 disabled:opacity-50', focusRing)}
        >
          {t('settingsPage.deletion.keep')}
        </button>
        <button
          type="submit"
          disabled={request.isPending || preview.isPending || (withCode && resendAt === null)}
          aria-busy={request.isPending || undefined}
          className={cn(
            'inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-[0.875rem] bg-coral px-4 text-sm font-bold text-white transition-[translate,filter,opacity] hover:-translate-y-px hover:brightness-110 disabled:translate-y-0 disabled:opacity-60',
            focusRing,
          )}
        >
          {request.isPending ? <PulsatingDots size="sm" tone="current" /> : t('settingsPage.deletion.confirm')}
        </button>
      </div>
    </form>
  );
}
