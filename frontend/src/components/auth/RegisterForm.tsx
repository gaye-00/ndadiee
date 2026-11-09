import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Mail, UserRound } from 'lucide-react';
import { AnimatePresence, m, useAnimate } from 'motion/react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useRegister, useUsernameAvailability } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { paths } from '@/router/paths';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import { applyServerErrors, getApiError, getApiErrorMessage } from '@/utils/apiError';
import { registerSchema, type RegisterFormValues } from '@/utils/validators';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';
import OAuthButtons from './OAuthButtons';
import PasswordField from './PasswordField';
import UsernameField from './UsernameField';
import { firstNameOf, WELCOME_PAUSE } from './welcome';

// Les conditions et la confidentialité s'ouvrent dans un nouvel onglet : le formulaire reste rempli
const legalLink = 'font-medium text-soft-foreground underline decoration-gold/60 underline-offset-2 hover:text-foreground';

/**
 * Ce qu'un nom d'utilisateur peut contenir (comme le backend) : minuscules sans accents, chiffres et « _ »
 * à la place des espaces, des tirets et des points ; 30 caractères au plus.
 */
function asUsername(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s.-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

/** Le nom d'utilisateur que propose un nom complet : « Awa Diop » → awa_diop. */
function usernameFrom(fullName: string): string {
  return asUsername(fullName).replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// La part de chaque champ dans l'étoffe : le mot de passe compte selon sa solidité
const SHARE = { fullName: 0.2, username: 0.25, email: 0.25, password: 0.3 } as const;

/**
 * Inscription. Le nom d'utilisateur se propose à partir du nom complet, se vérifie pendant qu'on le
 * tape et offre des variantes libres s'il est pris ; une jauge dit la solidité du mot de passe.
 * L'étoffe du métier monte avec chaque champ rempli.
 */
export default function RegisterForm() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const setProgress = useAuthLoomStore((s) => s.setProgress);
  const setWelcome = useAuthLoomStore((s) => s.setWelcome);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [scope, animate] = useAnimate<HTMLFormElement>();
  // Le membre a écrit son nom d'utilisateur lui-même : le nom complet ne le propose plus
  const handPicked = useRef(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', email: '', password: '' },
    mode: 'onTouched',
  });
  const [fullName, username, email, password] = useWatch({
    control,
    name: ['fullName', 'username', 'email', 'password'],
  });
  const usernameValid = registerSchema.shape.username.safeParse(username).success;
  const { availability, checking } = useUsernameAvailability(username, usernameValid);
  const usernameFree = availability?.available === true;
  const emailValid = registerSchema.shape.email.safeParse(email).success;

  const signup = useRegister({
    welcome: async (session) => {
      setDone(true);
      setWelcome(firstNameOf(session.user));
      await new Promise((resolve) => window.setTimeout(resolve, reduced ? WELCOME_PAUSE.reduced : WELCOME_PAUSE.full));
    },
  });

  // Le nom complet propose le nom d'utilisateur, tant que le membre ne l'a pas écrit lui-même
  useEffect(() => {
    if (!handPicked.current) {
      setValue('username', usernameFrom(fullName));
    }
  }, [fullName, setValue]);

  // L'étoffe monte avec chaque champ ; le mot de passe y compte selon sa solidité
  useEffect(() => {
    const strength =
      (password.length >= 8 ? 1 : password.length / 8) * 0.55 +
      (password.length >= 12 ? 0.15 : 0) +
      (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 0.15 : 0) +
      (/\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? 0.15 : 0);
    setProgress(
      SHARE.fullName * Math.min(fullName.trim().length / 8, 1) +
        SHARE.username * (usernameFree ? 1 : Math.min(username.length / 6, 1) * 0.5) +
        SHARE.email * (emailValid ? 1 : Math.min(email.length / 12, 1) * 0.5) +
        SHARE.password * strength,
    );
  }, [fullName, username, usernameFree, email, emailValid, password, setProgress]);

  // Le formulaire secoue la tête : non
  function refuse(message: string) {
    setFailure(message);
    if (!reduced && scope.current) {
      void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: 'easeOut' });
    }
  }

  const usernameField = register('username');
  function typeUsername(event: ChangeEvent<HTMLInputElement>) {
    handPicked.current = true;
    // Ce qui ne peut pas entrer dans un nom d'utilisateur n'y entre pas : « Awa Diop » s'écrit awa_diop
    event.target.value = asUsername(event.target.value);
    void usernameField.onChange(event);
  }

  function pick(suggestion: string) {
    handPicked.current = true;
    setValue('username', suggestion, { shouldValidate: true });
    setFocus('username');
  }

  function submit(values: RegisterFormValues) {
    if (signup.isPending) {
      return;
    }
    // Déjà pris : le champ le dit, inutile d'aller jusqu'au serveur
    if (availability && !availability.available) {
      setFocus('username');
      return;
    }
    setFailure(null);
    signup.mutate(
      {
        fullName: values.fullName.trim(),
        username: values.username,
        email: values.email.trim(),
        password: values.password,
        // Le backend écrit ses messages en français ou en anglais
        preferredLanguage: i18n.resolvedLanguage === 'en' ? 'EN' : 'FR',
      },
      {
        onError: (error) => {
          const body = getApiError(error);
          const field = Object.keys(body?.validationErrors ?? {})[0];
          // Le serveur dit quel champ ne va pas : e-mail déjà inscrit, nom pris entre-temps ou réservé
          if (field === 'email' && body?.errorCode === 'DUPLICATE_RESOURCE') {
            setError('email', { type: 'server', message: t('auth.errors.emailTaken') }, { shouldFocus: true });
            return;
          }
          if (field === 'username') {
            void queryClient.invalidateQueries({ queryKey: ['username-availability'] });
            const message = body?.errorCode === 'DUPLICATE_RESOURCE' ? t('auth.errors.usernameTaken') : t('auth.errors.usernameReserved');
            setError('username', { type: 'server', message }, { shouldFocus: true });
            return;
          }
          if (!applyServerErrors(error, setError)) {
            refuse(getApiErrorMessage(error));
          }
        },
      },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <div>
      <OAuthButtons onUnavailable={() => setFocus('fullName')} />

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
          label={t('auth.fields.fullName')}
          placeholder={t('auth.fields.fullNamePlaceholder')}
          icon={UserRound}
          autoComplete="name"
          valid={fullName.trim().length > 1 && !errors.fullName}
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <UsernameField
          label={t('auth.fields.username')}
          placeholder={t('auth.fields.usernamePlaceholder')}
          autoComplete="username"
          value={username}
          availability={availability}
          checking={checking}
          onPick={pick}
          error={errors.username?.message}
          {...usernameField}
          onChange={typeUsername}
        />
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
          valid={emailValid && !errors.email}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label={t('auth.fields.password')}
          autoComplete="new-password"
          meter={password}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="mt-1">
          <AuthSubmit
            label={t('auth.register.submit')}
            pendingLabel={t('auth.register.pending')}
            doneLabel={t('auth.welcomeButton')}
            state={done ? 'done' : signup.isPending ? 'pending' : 'idle'}
          />
        </div>

        {/* Vaut aussi pour l'inscription avec GitHub ou Google, plus haut */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          <Trans
            t={t}
            i18nKey="auth.register.legal"
            components={{
              terms: <Link to={paths.terms} target="_blank" className={legalLink} />,
              privacy: <Link to={paths.privacy} target="_blank" className={legalLink} />,
            }}
          />
        </p>
      </form>
    </div>
  );
}
