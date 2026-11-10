import { useTranslation } from 'react-i18next';
import AuthPage from '@/components/auth/AuthPage';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/** Mot de passe oublié : l'adresse du compte, où part un code pour en choisir un nouveau. */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthPage
      eyebrow={t('auth.forgot.eyebrow')}
      title={t('auth.forgot.title')}
      text={t('auth.forgot.text')}
      other={{ question: t('auth.forgot.remembered'), label: t('auth.forgot.toLogin'), to: paths.login, preload: pages.login }}
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
