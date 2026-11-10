import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import AuthPage from '@/components/auth/AuthPage';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { readPendingReset } from '@/lib/pendingVerification';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/**
 * Le code reçu par e-mail et le nouveau mot de passe. Sans demande en attente dans cet onglet, retour à « mot de passe
 * oublié ».
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const pending = readPendingReset();

  if (!pending) {
    return <Navigate to={paths.forgotPassword} replace />;
  }

  return (
    <AuthPage
      eyebrow={t('auth.reset.eyebrow')}
      title={t('auth.reset.title')}
      text={t('auth.reset.text', { email: pending.email })}
      other={{ question: t('auth.verify.wrongEmail'), label: t('auth.reset.changeEmail'), to: paths.forgotPassword, preload: pages.forgotPassword }}
    >
      <ResetPasswordForm key={pending.email} pending={pending} />
    </AuthPage>
  );
}
