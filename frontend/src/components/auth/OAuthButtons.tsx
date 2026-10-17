import { Info } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import gitlab from 'simple-icons/icons/gitlab.svg?raw';
import google from 'simple-icons/icons/google.svg?raw';
import GithubMark from '@/components/shared/GithubMark';
import { cn } from '@/lib/utils';

// Tracés des logos (Simple Icons, licence CC0), en une couleur
const pathOf = (svg: string) => / d="([^"]+)"/.exec(svg)?.[1] ?? '';
const GOOGLE = pathOf(google);
const GITLAB = pathOf(gitlab);

/**
 * Fournisseurs de connexion. Le backend ne les gère pas encore : `ready` passera à true, avec l'adresse
 * d'autorisation du backend (`/oauth2/authorization/github`…), quand il le fera. D'ici là, le bouton
 * dit que ça arrive, et renvoie vers le formulaire.
 */
const PROVIDERS = [
  { id: 'github', name: 'GitHub', ready: false },
  { id: 'google', name: 'Google', ready: false },
  { id: 'gitlab', name: 'GitLab', ready: false },
] as const;

type Provider = (typeof PROVIDERS)[number];

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

/**
 * Se connecter (ou s'inscrire) avec GitHub, Google ou GitLab. GitHub d'abord, en grand : c'est là que
 * vivent les projets des membres.
 *
 * @param onUnavailable le fournisseur n'est pas encore branché : le formulaire prend le relais (focus)
 */
export default function OAuthButtons({ onUnavailable }: { onUnavailable?: () => void }) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<Provider | null>(null);
  const [github, ...others] = PROVIDERS;

  function choose(provider: Provider) {
    if (!provider.ready) {
      setNotice(provider);
      onUnavailable?.();
    }
  }

  const soon = (
    <span className="rounded-full bg-foreground/8 px-1.5 py-px font-mono text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
      {t('auth.oauth.soon')}
    </span>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => choose(github)}
        className="group/oauth relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-foreground px-5 text-[0.9375rem] font-bold text-background transition-[scale,box-shadow] duration-300 outline-none hover:shadow-[0_14px_34px_-18px_var(--foreground)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
      >
        {/* Un reflet passe sur le bouton au survol */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -start-1/3 w-1/3 skew-x-[-20deg] bg-linear-to-r from-transparent via-background/25 to-transparent transition-transform duration-700 ease-out-expo group-hover/oauth:translate-x-[420%] rtl:group-hover/oauth:-translate-x-[420%]"
        />
        <ProviderLogo provider={github} className="size-5" />
        {t('auth.oauth.continueWith', { provider: github.name })}
        <span className="rounded-full bg-background/15 px-1.5 py-px font-mono text-[0.625rem] font-medium tracking-wide uppercase">
          {t('auth.oauth.soon')}
        </span>
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {others.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => choose(provider)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-surface px-3 text-sm font-semibold transition-colors outline-none hover:border-border-strong hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ProviderLogo provider={provider} className="size-4" />
            {provider.name}
            {soon}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {notice && (
          <m.p
            key={notice.id}
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <span className="mt-3 flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2.5 text-xs leading-relaxed text-soft-foreground">
              <Info aria-hidden className="mt-px size-3.5 shrink-0 text-gold" />
              {t('auth.oauth.unavailable', { provider: notice.name })}
            </span>
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
