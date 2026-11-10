import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { AnimatePresence, m, useAnimate } from 'motion/react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useResendVerification, useVerifyEmail } from '@/hooks/useAuth';
import { useCountdown } from '@/hooks/useCountdown';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { forgetPendingVerification, rememberPendingVerification, type StoredVerification } from '@/lib/pendingVerification';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';
import { firstNameOf, WELCOME_PAUSE } from './welcome';

const CODE_LENGTH = 6;

/**
 * Le code à 6 chiffres reçu par e-mail. Chaque chiffre fait monter l'étoffe du métier ; le sixième envoie le code.
 * Juste, l'étoffe s'achève sur le prénom du membre et la session s'ouvre. Un nouveau code se demande après le délai
 * de renvoi.
 */
export default function VerifyEmailForm({ pending }: { pending: StoredVerification }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const setProgress = useAuthLoomStore((s) => s.setProgress);
  const setWelcome = useAuthLoomStore((s) => s.setWelcome);
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(pending.resendAt);
  const [done, setDone] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const wait = useCountdown(resendAt);

  const verify = useVerifyEmail({
    welcome: async (session) => {
      setDone(true);
      setWelcome(firstNameOf(session.user));
      await new Promise((resolve) => window.setTimeout(resolve, reduced ? WELCOME_PAUSE.reduced : WELCOME_PAUSE.full));
      forgetPendingVerification();
    },
  });
  const resend = useResendVerification();

  useEffect(() => {
    setProgress(code.length / CODE_LENGTH);
  }, [code, setProgress]);

  // Le formulaire secoue la tête : non
  function refuse(message: string) {
    setFailure(message);
    setNotice(null);
    if (!reduced && scope.current) {
      void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
    }
  }

  function send(value: string) {
    if (verify.isPending || done || value.length !== CODE_LENGTH) {
      return;
    }
    setFailure(null);
    verify.mutate(
      { email: pending.email, code: value },
      {
        onError: (error) => {
          const body = getApiError(error);
          setCode('');
          switch (body?.errorCode) {
            case 'VERIFICATION_CODE_INVALID':
              refuse(t('auth.verify.invalid', { count: Number(body.details?.remainingAttempts ?? 0) }));
              break;
            case 'VERIFICATION_CODE_EXPIRED':
              refuse(t('auth.verify.expired'));
              break;
            case 'VERIFICATION_TOO_MANY_ATTEMPTS':
              refuse(t('auth.verify.tooMany'));
              break;
            case 'ACCOUNT_BLOCKED':
              refuse(t('auth.login.blocked'));
              break;
            default:
              refuse(getApiErrorMessage(error));
          }
        },
      },
    );
  }

  // Seuls les chiffres entrent ; un code collé (« 042 917 ») aussi. Le sixième chiffre envoie le code
  function type(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(value);
    if (value.length === CODE_LENGTH) {
      send(value);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(code);
  }

  function again() {
    if (wait > 0 || resend.isPending) {
      return;
    }
    resend.mutate(pending.email, {
      onSuccess: (next) => {
        setResendAt(rememberPendingVerification(next).resendAt);
        setFailure(null);
        setNotice(t('auth.verify.resent'));
      },
      onError: (error) => refuse(getApiErrorMessage(error)),
    });
  }

  return (
    <form ref={scope} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
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

      <AuthField
        label={t('auth.verify.code')}
        icon={KeyRound}
        latin
        value={code}
        onChange={type}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={CODE_LENGTH + 2}
        placeholder="000000"
        autoFocus
        disabled={done}
        // Le code en chiffres espacés, comme dans l'e-mail (le libellé garde sa police)
        className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.45em]"
        hint={t('auth.verify.hint')}
      />

      <AuthSubmit
        label={t('auth.verify.submit')}
        pendingLabel={t('auth.verify.pending')}
        doneLabel={t('auth.welcomeButton')}
        state={done ? 'done' : verify.isPending ? 'pending' : 'idle'}
      />

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.verify.noCode')}{' '}
        <button
          type="button"
          onClick={again}
          disabled={wait > 0 || resend.isPending || done}
          className="rounded-sm font-semibold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:text-faint-foreground disabled:no-underline"
        >
          {wait > 0 ? t('auth.verify.resendIn', { seconds: wait }) : t('auth.verify.resend')}
        </button>
      </p>
    </form>
  );
}
