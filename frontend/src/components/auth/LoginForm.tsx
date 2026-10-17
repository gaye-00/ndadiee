import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, AtSign } from 'lucide-react';
import { AnimatePresence, m, useAnimate } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { applyServerErrors, getApiError, getApiErrorMessage } from '@/utils/apiError';
import { loginSchema, type LoginFormValues } from '@/utils/validators';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';
import OAuthButtons from './OAuthButtons';
import PasswordField from './PasswordField';
import { firstNameOf, WELCOME_PAUSE } from './welcome';

/**
 * Connexion, avec son e-mail ou son nom d'utilisateur. Chaque caractère tapé fait monter l'étoffe du
 * métier ; la session ouverte, l'étoffe s'achève sur le prénom du membre, puis la page s'en va.
 */
export default function LoginForm() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const setProgress = useAuthLoomStore((s) => s.setProgress);
  const setWelcome = useAuthLoomStore((s) => s.setWelcome);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  const {
    register,
    handleSubmit,
    control,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
    mode: 'onTouched',
  });
  const [identifier, password] = useWatch({ control, name: ['identifier', 'password'] });

  const login = useLogin({
    welcome: async (session) => {
      setDone(true);
      setWelcome(firstNameOf(session.user));
      await new Promise((resolve) => window.setTimeout(resolve, reduced ? WELCOME_PAUSE.reduced : WELCOME_PAUSE.full));
    },
  });

  // L'étoffe monte avec la saisie : la moitié pour l'identifiant, la moitié pour le mot de passe
  useEffect(() => {
    setProgress(Math.min(identifier.trim().length, 8) / 16 + Math.min(password.length, 10) / 20);
  }, [identifier, password, setProgress]);

  // Le formulaire secoue la tête : non
  function refuse(message: string) {
    setFailure(message);
    if (!reduced && scope.current) {
      void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
    }
  }

  function submit(values: LoginFormValues) {
    if (login.isPending) {
      return;
    }
    setFailure(null);
    login.mutate(values, {
      onError: (error) => {
        if (getApiError(error)?.status === 401) {
          refuse(t('auth.login.failed'));
          setFocus('password', { shouldSelect: true });
          return;
        }
        if (!applyServerErrors(error, setError)) {
          refuse(getApiErrorMessage(error));
        }
      },
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <div>
      <OAuthButtons onUnavailable={() => setFocus('identifier')} />

      <form ref={scope} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <AnimatePresence initial={false}>
          {failure && (
            <m.p
              key="failure"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className="flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {failure}
              </span>
            </m.p>
          )}
        </AnimatePresence>

        <AuthField
          label={t('auth.fields.identifier')}
          placeholder={t('auth.fields.identifierPlaceholder')}
          icon={AtSign}
          latin
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <PasswordField
          label={t('auth.fields.password')}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="mt-1">
          <AuthSubmit
            label={t('auth.login.submit')}
            pendingLabel={t('auth.login.pending')}
            doneLabel={t('auth.welcomeButton')}
            state={done ? 'done' : login.isPending ? 'pending' : 'idle'}
          />
        </div>
      </form>
    </div>
  );
}
