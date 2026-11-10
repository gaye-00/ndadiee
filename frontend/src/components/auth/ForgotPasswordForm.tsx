import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useAnimate } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForgotPassword } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rememberPendingReset } from '@/lib/pendingVerification';
import { paths } from '@/router/paths';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { applyServerErrors, getApiErrorMessage } from '@/utils/apiError';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/utils/validators';
import AuthAlert from './AuthAlert';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';

/** La page visée avant la connexion (ProtectedRoute), et l'adresse déjà tapée sur la page de connexion */
type ForgotState = { email?: string } & Record<string, unknown>;

/**
 * Mot de passe oublié : l'adresse du compte. Un code à 6 chiffres y part, et la page du nouveau mot de passe s'ouvre.
 * La réponse est la même qu'un compte utilise cette adresse ou non : la page ne dit pas qui est inscrit.
 */
export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ForgotState | null) ?? {};
  const setProgress = useAuthLoomStore((s) => s.setProgress);
  const [failure, setFailure] = useState<string | null>(null);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: state.email ?? '' },
    mode: 'onTouched',
  });
  const email = useWatch({ control, name: 'email' });

  useEffect(() => {
    setProgress(Math.min(email.trim().length, 16) / 16);
  }, [email, setProgress]);

  function submit(values: ForgotPasswordFormValues) {
    if (forgot.isPending) {
      return;
    }
    setFailure(null);
    forgot.mutate(values.email.trim(), {
      onSuccess: (pending) => {
        rememberPendingReset(pending);
        // La page visée avant la connexion suit : le nouveau mot de passe choisi, on y arrive
        const next = { ...state };
        delete next.email;
        void navigate(paths.resetPassword, { state: next });
      },
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          setFailure(getApiErrorMessage(error));
          if (!reduced && scope.current) {
            void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
          }
        }
      },
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <form ref={scope} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <AuthAlert failure={failure} />
      <AuthField
        label={t('auth.fields.email')}
        placeholder={t('auth.fields.emailPlaceholder')}
        icon={Mail}
        latin
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        hint={t('auth.forgot.hint')}
        error={errors.email?.message}
        {...register('email')}
      />
      <AuthSubmit
        label={t('auth.forgot.submit')}
        pendingLabel={t('auth.forgot.pending')}
        doneLabel={t('auth.forgot.submit')}
        state={forgot.isPending ? 'pending' : 'idle'}
      />
    </form>
  );
}
