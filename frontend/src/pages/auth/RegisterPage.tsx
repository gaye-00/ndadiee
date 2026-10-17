import { useTranslation } from 'react-i18next';
import AuthPage from '@/components/auth/AuthPage';
import RegisterForm from '@/components/auth/RegisterForm';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/** Inscription : avec GitHub, Google ou GitLab (bientôt), ou par formulaire. */
export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <AuthPage
      eyebrow={t('auth.register.eyebrow')}
      title={t('auth.register.title')}
      text={t('auth.register.text')}
      other={{ question: t('auth.register.hasAccount'), label: t('auth.register.toLogin'), to: paths.login, preload: pages.login }}
    >
      <RegisterForm />
    </AuthPage>
  );
}
