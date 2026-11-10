import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useAnimate } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useForgotPassword, useResetPassword } from '@/hooks/useAuth';
import { useCountdown } from '@/hooks/useCountdown';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { forgetPendingReset, rememberPendingReset, type StoredVerification } from '@/lib/pendingVerification';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { applyServerErrors, getApiError, getApiErrorMessage } from '@/utils/apiError';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/utils/validators';
import AuthAlert from './AuthAlert';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';
import PasswordField from './PasswordField';
import { firstNameOf, WELCOME_PAUSE } from './welcome';

const CODE_LENGTH = 6;

/**
 * Le code reçu par e-mail, et le nouveau mot de passe, tapé deux fois. Juste, le mot de passe change, les sessions
 * ouvertes ailleurs se ferment, et celle-ci s'ouvre (l'étoffe s'achève sur le prénom du membre). Un nouveau code se
 * demande après le délai de renvoi.
 */
export default function ResetPasswordForm({ pending }: { pending: StoredVerification }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const setProgress = useAuthLoomStore((s) => s.setProgress);
  const setWelcome = useAuthLoomStore((s) => s.setWelcome);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(pending.resendAt);
  const [done, setDone] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const wait = useCountdown(resendAt);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    resetField,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirm: '' },
    mode: 'onTouched',
  });
  const [code, password, confirm] = useWatch({ control, name: ['code', 'password', 'confirm'] });

  const reset = useResetPassword({
    welcome: async (session) => {
      setDone(true);
      setWelcome(firstNameOf(session.user));
      await new Promise((resolve) => window.setTimeout(resolve, reduced ? WELCOME_PAUSE.reduced : WELCOME_PAUSE.full));
      forgetPendingReset();
    },
  });
  const resend = useForgotPassword();

  // L'étoffe monte avec la saisie : le code, puis le mot de passe, puis sa confirmation
  useEffect(() => {
    setProgress(code.length / CODE_LENGTH / 3 + Math.min(password.length, 10) / 30 + Math.min(confirm.length, 10) / 30);
  }, [code, password, confirm, setProgress]);

  // Le formulaire secoue la tête : non
  function refuse(message: string) {
    setFailure(message);
    setNotice(null);
    if (!reduced && scope.current) {
      void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
    }
  }

  function codeRefused(message: string) {
    refuse(message);
    resetField('code');
    setFocus('code');
  }

  function submit(values: ResetPasswordFormValues) {
    if (reset.isPending || done) {
      return;
    }
    setFailure(null);
    reset.mutate(
      { email: pending.email, code: values.code, password: values.password },
      {
        onError: (error) => {
          const body = getApiError(error);
          switch (body?.errorCode) {
            case 'VERIFICATION_CODE_INVALID':
              codeRefused(t('auth.verify.invalid', { count: Number(body.details?.remainingAttempts ?? 0) }));
              break;
            case 'VERIFICATION_CODE_EXPIRED':
              codeRefused(t('auth.verify.expired'));
              break;
            case 'VERIFICATION_TOO_MANY_ATTEMPTS':
              codeRefused(t('auth.verify.tooMany'));
              break;
            // Le mot de passe a bien changé, mais un compte suspendu n'ouvre pas de session
            case 'ACCOUNT_BLOCKED':
              forgetPendingReset();
              refuse(t('auth.reset.blocked'));
              break;
            default:
              if (!applyServerErrors(error, setError)) {
                refuse(getApiErrorMessage(error));
              }
          }
        },
      },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  function again() {
    if (wait > 0 || resend.isPending) {
      return;
    }
    resend.mutate(pending.email, {
      onSuccess: (next) => {
        setResendAt(rememberPendingReset(next).resendAt);
        setFailure(null);
        setNotice(t('auth.verify.resent'));
      },
      onError: (error) => refuse(getApiErrorMessage(error)),
    });
  }

  return (
    <form ref={scope} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <AuthAlert failure={failure} notice={notice} />

      <Controller
        control={control}
        name="code"
        render={({ field }) => (
          <AuthField
            ref={field.ref}
            name={field.name}
            label={t('auth.verify.code')}
            icon={KeyRound}
            latin
            value={field.value}
            // Seuls les chiffres entrent ; un code collé (« 042 917 ») aussi
            onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            onBlur={field.onBlur}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH + 2}
            placeholder="000000"
            autoFocus
            disabled={done}
            className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.45em]"
            hint={t('auth.verify.hint')}
            error={errors.code?.message}
          />
        )}
      />
      <PasswordField
        label={t('auth.reset.password')}
        autoComplete="new-password"
        meter={password}
        disabled={done}
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        label={t('auth.reset.confirm')}
        autoComplete="new-password"
        disabled={done}
        error={errors.confirm?.message}
        {...register('confirm')}
      />

      <AuthSubmit
        label={t('auth.reset.submit')}
        pendingLabel={t('auth.reset.pending')}
        doneLabel={t('auth.welcomeButton')}
        state={done ? 'done' : reset.isPending ? 'pending' : 'idle'}
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
