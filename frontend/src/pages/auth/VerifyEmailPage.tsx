import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import AuthPage from '@/components/auth/AuthPage';
import VerifyEmailForm from '@/components/auth/VerifyEmailForm';
import { readPendingVerification } from '@/lib/pendingVerification';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/**
 * Le code reçu par e-mail, après l'inscription (ou une connexion avant d'avoir confirmé son adresse). Sans
 * inscription en attente dans cet onglet, retour à l'inscription.
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const pending = readPendingVerification();

  if (!pending) {
    return <Navigate to={paths.register} replace />;
  }

  return (
    <AuthPage
      eyebrow={t('auth.verify.eyebrow')}
      title={t('auth.verify.title')}
      text={t('auth.verify.text', { email: pending.email })}
      other={{ question: t('auth.verify.wrongEmail'), label: t('auth.verify.changeEmail'), to: paths.register, preload: pages.register }}
    >
      {/* Une autre adresse repart d'un formulaire neuf ; la page visée suit dans location.state (GuestRoute) */}
      <VerifyEmailForm key={pending.email} pending={pending} />
    </AuthPage>
  );
}
