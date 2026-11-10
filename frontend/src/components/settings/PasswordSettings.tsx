import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PasswordInput from './PasswordInput';
import SettingsSection from './SettingsSection';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useChangePassword } from '@/hooks/useAccount';
import { useAuth, useForgotPassword, useResetPassword } from '@/hooks/useAuth';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';
import { applyServerErrors, getApiError, getApiErrorMessage } from '@/utils/apiError';
import {
  changePasswordSchema,
  resetPasswordSchema,
  type ChangePasswordFormValues,
  type ResetPasswordFormValues,
} from '@/utils/validators';

const primaryButton = cn(
  'inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
  'shadow-[0_10px_24px_-12px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 enabled:hover:-translate-y-px disabled:opacity-60',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
);
const linkButton =
  'rounded-sm text-sm font-semibold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:text-faint-foreground disabled:no-underline';

/**
 * Le mot de passe du compte. Connu : il se change en confirmant l'actuel. Inconnu (compte ouvert avec GitHub ou Google,
 * ou oublié) : un code part à l'adresse du compte, et il se choisit avec ce code. Dans les deux cas, les sessions
 * ouvertes ailleurs se ferment ; celle-ci continue.
 */
export default function PasswordSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Le compte n'a pas de mot de passe, ou le membre l'a oublié : on passe par un code
  const [byCode, setByCode] = useState(false);

  if (!user) {
    return null;
  }
  const withCode = byCode || !user.passwordSet;

  return (
    <SettingsSection
      id="password"
      tone="gold"
      icon={KeyRound}
      title={t('settingsPage.security.passwordTitle')}
      description={t(user.passwordSet ? 'settingsPage.security.passwordDescription' : 'settingsPage.security.passwordlessDescription')}
    >
      <div id="password-form" className="scroll-mt-28 p-5 sm:p-7">
        {withCode ? (
          <ChooseWithCode email={user.email} onBack={user.passwordSet ? () => setByCode(false) : undefined} />
        ) : (
          <ChangePassword onForgot={() => setByCode(true)} />
        )}
      </div>
    </SettingsSection>
  );
}

function ChangePassword({ onForgot }: { onForgot: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
    mode: 'onTouched',
  });

  function submit(values: ChangePasswordFormValues) {
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          reset();
          toast.success(t('settingsPage.security.changed'));
        },
        onError: (error) => {
          const body = getApiError(error);
          if (body?.errorCode === 'PASSWORD_INCORRECT') {
            setError('currentPassword', { type: 'server', message: t('settingsPage.security.errors.incorrect') }, { shouldFocus: true });
          } else if (body?.errorCode === 'PASSWORD_UNCHANGED') {
            setError('newPassword', { type: 'server', message: t('settingsPage.security.errors.unchanged') }, { shouldFocus: true });
          } else if (body?.errorCode === 'PASSWORD_NOT_SET') {
            onForgot();
          } else if (!applyServerErrors(error, setError)) {
            toast.error(getApiErrorMessage(error));
          }
        },
      },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Le nom du compte, pour que le gestionnaire de mots de passe sache lequel mettre à jour */}
      <input type="text" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
      <PasswordInput
        label={t('settingsPage.security.current')}
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <PasswordInput
          label={t('settingsPage.security.new')}
          autoComplete="new-password"
          hint={t('settingsPage.security.newHint')}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label={t('settingsPage.security.confirm')}
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
      </div>
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onForgot} className={cn(linkButton, 'self-center sm:self-auto')}>
          {t('settingsPage.security.forgot')}
        </button>
        <button type="submit" disabled={change.isPending} className={primaryButton}>
          {change.isPending ? (
            <PulsatingDots size="sm" tone="current" label={t('settingsPage.security.saving')} />
          ) : (
            <>
              <ShieldCheck aria-hidden className="size-4" />
              {t('settingsPage.security.submit')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/** Choisir un mot de passe avec un code envoyé à l'adresse du compte (les mêmes routes que « mot de passe oublié »). */
function ChooseWithCode({ email, onBack }: { email: string; onBack?: () => void }) {
  const { t } = useTranslation();
  const [resendAt, setResendAt] = useState<number | null>(null);
  const wait = useCountdown(resendAt ?? 0);
  const send = useForgotPassword();
  const choose = useResetPassword();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    resetField,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirm: '' },
    mode: 'onTouched',
  });

  function sendCode() {
    if (send.isPending || wait > 0) {
      return;
    }
    send.mutate(email, {
      onSuccess: (pending) => setResendAt(Date.now() + pending.resendAvailableInSeconds * 1000),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  function codeRefused(message: string) {
    resetField('code');
    setError('code', { type: 'server', message }, { shouldFocus: true });
  }

  function submit(values: ResetPasswordFormValues) {
    choose.mutate(
      { email, code: values.code, password: values.password },
      {
        onSuccess: () => {
          reset();
          setResendAt(null);
          toast.success(t('settingsPage.security.chosen'));
          onBack?.();
        },
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
            default:
              if (!applyServerErrors(error, setError)) {
                toast.error(getApiErrorMessage(error));
              }
          }
        },
      },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  // Avant le premier code : ce qui va se passer, et le bouton qui l'envoie
  if (resendAt === null) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <span aria-hidden className="hidden size-10 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold sm:grid">
          <MailCheck className="size-4.5" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-soft-foreground">{t('settingsPage.security.codeIntro', { email })}</p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button type="button" onClick={sendCode} disabled={send.isPending} className={primaryButton}>
            {send.isPending ? <PulsatingDots size="sm" tone="current" /> : t('settingsPage.security.sendCode')}
          </button>
          {onBack && (
            <button type="button" onClick={onBack} className={cn(linkButton, 'self-center')}>
              {t('settingsPage.security.backToCurrent')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <p role="status" className="flex items-start gap-2.5 rounded-xl border border-jade/30 bg-jade/8 px-3.5 py-3 text-sm text-soft-foreground">
        <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-jade" />
        {t('settingsPage.security.codeSent', { email })}
      </p>
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <Controller
        control={control}
        name="code"
        render={({ field }) => (
          <PasswordInput
            ref={field.ref}
            name={field.name}
            code
            label={t('auth.verify.code')}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={field.onBlur}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="000000"
            autoFocus
            error={errors.code?.message}
          />
        )}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <PasswordInput
          label={t('settingsPage.security.new')}
          autoComplete="new-password"
          hint={t('settingsPage.security.newHint')}
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label={t('settingsPage.security.confirm')}
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
      </div>
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
          <button type="button" onClick={sendCode} disabled={wait > 0 || send.isPending} className={linkButton}>
            {wait > 0 ? t('auth.verify.resendIn', { seconds: wait }) : t('auth.verify.resend')}
          </button>
          {onBack && (
            <button type="button" onClick={onBack} className={linkButton}>
              {t('settingsPage.security.backToCurrent')}
            </button>
          )}
        </span>
        <button type="submit" disabled={choose.isPending} className={primaryButton}>
          {choose.isPending ? (
            <PulsatingDots size="sm" tone="current" label={t('settingsPage.security.saving')} />
          ) : (
            <>
              <ShieldCheck aria-hidden className="size-4" />
              {t('settingsPage.security.choose')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
