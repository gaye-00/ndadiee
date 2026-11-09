import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useOAuthLogin } from '@/hooks/useAuth';
import {
  callbackUrl,
  isOAuthProvider,
  OAUTH_PROVIDERS,
  oauthOrigin,
  takePendingOAuth,
  type OAuthFailure,
} from '@/lib/oauth';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Retour de GitHub ou Google (/auth/callback/github?code=…&state=…). L'état doit être celui que cet onglet a tiré en
 * partant ; le code est alors échangé contre une session, et le membre arrive là où il voulait aller. Sinon, il
 * revient à la page d'où il est parti, avec la raison.
 */
export default function OAuthCallbackPage() {
  const { t, i18n } = useTranslation();
  const { provider } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useOAuthLogin();
  // Une seule fois, même quand React rejoue l'effet en développement : un code ne s'échange qu'une fois
  const started = useRef(false);
  const name = isOAuthProvider(provider) ? OAUTH_PROVIDERS[provider] : (provider ?? '');

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const pending = takePendingOAuth(provider, params.get('state'));
    const fail = (failure: Omit<OAuthFailure, 'provider'>) =>
      navigate(oauthOrigin(pending), { replace: true, state: { oauthFailure: { provider: name, ...failure }, from: pending?.from } });

    const code = params.get('code');
    if (!isOAuthProvider(provider) || !pending) {
      fail({ code: 'OAUTH_FAILED' });
      return;
    }
    // Refusé chez le fournisseur (« Annuler ») : pas une erreur, un choix
    if (params.get('error') || !code) {
      fail({ code: params.get('error') === 'access_denied' ? 'OAUTH_CANCELLED' : 'OAUTH_FAILED' });
      return;
    }

    login.mutate(
      {
        provider,
        body: {
          code,
          redirectUri: callbackUrl(provider),
          codeVerifier: pending.verifier,
          // Comme à l'inscription : la langue de l'interface, pour un compte créé à cette occasion
          preferredLanguage: i18n.resolvedLanguage === 'en' ? 'EN' : 'FR',
        },
      },
      {
        onSuccess: () => {
          const from = pending.from;
          navigate(from ? `${from.pathname}${from.search}${from.hash}` : paths.dashboard, { replace: true });
        },
        onError: (error) => {
          const body = getApiError(error);
          fail({ code: body?.errorCode ?? 'OAUTH_FAILED', reason: body?.details?.reason });
        },
      },
    );
    // `started` garde l'effet d'agir plus d'une fois, quels que soient les rendus suivants
  }, [provider, params, navigate, login, name, i18n.resolvedLanguage]);

  const text = t('auth.oauth.connecting', { provider: name });
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5">
      <div className="flex flex-col items-center gap-5 text-center">
        <PulsatingDots label={text} />
        <p aria-hidden className="text-sm text-muted-foreground">
          {text}
        </p>
      </div>
    </main>
  );
}
