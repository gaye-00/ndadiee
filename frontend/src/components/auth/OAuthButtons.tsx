import type { TFunction } from 'i18next';
import { AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import gitlab from 'simple-icons/icons/gitlab.svg?raw';
import google from 'simple-icons/icons/google.svg?raw';
import GithubMark from '@/components/shared/GithubMark';
import { useOAuthProviders } from '@/hooks/useAuth';
import { beginOAuth, isOAuthProvider, type OAuthFailure } from '@/lib/oauth';
import { cn } from '@/lib/utils';
import { getApiError } from '@/utils/apiError';

// Tracés des logos (Simple Icons, licence CC0), en une couleur
const pathOf = (svg: string) => / d="([^"]+)"/.exec(svg)?.[1] ?? '';
const GOOGLE = pathOf(google);
const GITLAB = pathOf(gitlab);

/**
 * Fournisseurs de connexion. GitHub et Google sont actifs dès que le serveur les annonce configurés
 * (/v1/auth/oauth/providers) ; GitLab n'est pas encore géré par le backend : son bouton dit que ça arrive, et
 * renvoie vers le formulaire.
 */
const PROVIDERS = [
  { id: 'github', name: 'GitHub' },
  { id: 'google', name: 'Google' },
  { id: 'gitlab', name: 'GitLab' },
] as const;

type Provider = (typeof PROVIDERS)[number];

interface Notice {
  key: string;
  tone: 'info' | 'error';
  message: string;
}

function ProviderLogo({ provider, className }: { provider: Provider; className?: string }) {
  if (provider.id === 'github') {
    return <GithubMark className={className} />;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={cn('fill-current', className)}>
      <path d={provider.id === 'google' ? GOOGLE : GITLAB} />
    </svg>
  );
}

/** Ce que le membre lit au retour d'une connexion qui n'a pas abouti (OAuthCallbackPage) */
function noticeOf(failure: OAuthFailure, t: TFunction): Notice {
  const { provider } = failure;
  const notice = (tone: Notice['tone'], message: string): Notice => ({ key: `${provider}-${failure.code}`, tone, message });
  switch (failure.code) {
    case 'OAUTH_CANCELLED':
      return notice('info', t('auth.oauth.cancelled', { provider }));
    case 'OAUTH_PROVIDER_UNAVAILABLE':
      return notice('info', t('auth.oauth.unavailable', { provider }));
    case 'OAUTH_EMAIL_REQUIRED':
      return notice('error', t('auth.oauth.emailRequired', { provider }));
    case 'OAUTH_ADMIN_ACCOUNT':
      return notice('error', t('auth.oauth.adminAccount'));
    case 'OAUTH_ACCOUNT_CONFLICT':
      return notice('error', t('auth.oauth.conflict', { provider }));
    // Compte suspendu par l'équipe : le titulaire lit pourquoi
    case 'ACCOUNT_BLOCKED':
      return notice(
        'error',
        failure.reason ? `${t('auth.login.blocked')} ${t('auth.login.blockedReason', { reason: failure.reason })}` : t('auth.login.blocked'),
      );
    default:
      return notice('error', t('auth.oauth.failed', { provider }));
  }
}

/**
 * Se connecter (ou s'inscrire) avec GitHub, Google ou GitLab. GitHub d'abord, en grand : c'est là que
 * vivent les projets des membres. Un clic envoie chez le fournisseur ; on revient par OAuthCallbackPage.
 *
 * @param onUnavailable le fournisseur n'est pas encore branché : le formulaire prend le relais (focus)
 */
export default function OAuthButtons({ onUnavailable }: { onUnavailable?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const providers = useOAuthProviders();
  const routeState = location.state as { oauthFailure?: OAuthFailure; from?: Location } | null;
  const [notice, setNotice] = useState<Notice | null>(() => (routeState?.oauthFailure ? noticeOf(routeState.oauthFailure, t) : null));
  const [leaving, setLeaving] = useState<Provider['id'] | null>(null);
  const [github, ...others] = PROVIDERS;

  // L'échec est lu : il quitte l'historique, pour ne pas reparaître si l'on recharge la page
  useEffect(() => {
    if (routeState?.oauthFailure) {
      void navigate(location.pathname, { replace: true, state: routeState.from ? { from: routeState.from } : null });
    }
  }, [routeState, location.pathname, navigate]);

  // Revenu du fournisseur par le bouton Précédent (page restaurée telle quelle) : les boutons redeviennent actifs
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLeaving(null);
      }
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  // « Bientôt » seulement une fois la réponse du serveur connue : pas de clignotement au chargement
  const soon = (provider: Provider) =>
    !isOAuthProvider(provider.id) || (providers.isSuccess && !providers.data.includes(provider.id));

  function choose(provider: Provider) {
    if (leaving) {
      return;
    }
    if (soon(provider) || !isOAuthProvider(provider.id)) {
      setNotice({ key: provider.id, tone: 'info', message: t('auth.oauth.unavailable', { provider: provider.name }) });
      onUnavailable?.();
      return;
    }
    setNotice(null);
    setLeaving(provider.id);
    beginOAuth(provider.id, location.pathname, routeState?.from).catch((error: unknown) => {
      setLeaving(null);
      setNotice(noticeOf({ provider: provider.name, code: getApiError(error)?.errorCode ?? 'OAUTH_FAILED' }, t));
    });
  }

  const label = (provider: Provider) =>
    leaving === provider.id ? t('auth.oauth.redirecting', { provider: provider.name }) : provider.name;

  const soonBadge = (
    <span className="rounded-full bg-foreground/8 px-1.5 py-px font-mono text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
      {t('auth.oauth.soon')}
    </span>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => choose(github)}
        disabled={leaving !== null}
        aria-busy={leaving === github.id}
        className="group/oauth relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-foreground px-5 text-[0.9375rem] font-bold text-background transition-[scale,box-shadow,opacity] duration-300 outline-none hover:shadow-[0_14px_34px_-18px_var(--foreground)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
      >
        {/* Un reflet passe sur le bouton au survol */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -start-1/3 w-1/3 skew-x-[-20deg] bg-linear-to-r from-transparent via-background/25 to-transparent transition-transform duration-700 ease-out-expo group-hover/oauth:translate-x-[420%] rtl:group-hover/oauth:-translate-x-[420%]"
        />
        <ProviderLogo provider={github} className="size-5" />
        {leaving === github.id ? label(github) : t('auth.oauth.continueWith', { provider: github.name })}
        {soon(github) && (
          <span className="rounded-full bg-background/15 px-1.5 py-px font-mono text-[0.625rem] font-medium tracking-wide uppercase">
            {t('auth.oauth.soon')}
          </span>
        )}
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {others.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => choose(provider)}
            disabled={leaving !== null}
            aria-busy={leaving === provider.id}
            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-input bg-surface px-3 text-sm font-semibold transition-colors outline-none hover:border-border-strong hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-wait disabled:opacity-70"
          >
            <ProviderLogo provider={provider} className="size-4 shrink-0" />
            <span className="truncate">{label(provider)}</span>
            {soon(provider) && soonBadge}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {notice && (
          <m.p
            key={notice.key}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {notice.tone === 'error' ? (
              <span className="mt-3 flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-2.5 text-xs leading-relaxed text-coral">
                <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
                {notice.message}
              </span>
            ) : (
              <span className="mt-3 flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2.5 text-xs leading-relaxed text-soft-foreground">
                <Info aria-hidden className="mt-px size-3.5 shrink-0 text-gold" />
                {notice.message}
              </span>
            )}
          </m.p>
        )}
      </AnimatePresence>

      {/* Deux fils qui se rejoignent au milieu : « ou avec ton e-mail » */}
      <div className="my-7 flex items-center gap-3 text-xs text-faint-foreground">
        <span aria-hidden className="auth-divider h-px flex-1" />
        {t('auth.oauth.or')}
        <span aria-hidden className="auth-divider h-px flex-1 -scale-x-100" />
      </div>
    </div>
  );
}
