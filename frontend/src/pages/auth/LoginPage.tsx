import { useTranslation } from 'react-i18next';
import AuthPage from '@/components/auth/AuthPage';
import LoginForm from '@/components/auth/LoginForm';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/** Connexion : avec GitHub, Google ou GitLab (bientôt), ou avec son e-mail ou son nom d'utilisateur. */
export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <AuthPage
      eyebrow={t('auth.login.eyebrow')}
      title={t('auth.login.title')}
      text={t('auth.login.text')}
      other={{ question: t('auth.login.noAccount'), label: t('auth.login.toRegister'), to: paths.register, preload: pages.register }}
    >
      <LoginForm />
    </AuthPage>
  );
}
