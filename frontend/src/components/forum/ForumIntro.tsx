import { PenLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMemberAction } from '@/hooks/useMemberAction';
import { useForumOverview } from '@/hooks/useQuestions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/**
 * L'accroche du forum, et le forum en chiffres : sujets, réponses, sujets résolus, contributeurs, et ceux qui
 * attendent encore une réponse. « Poser une question » ouvre le formulaire ; un visiteur est invité à se connecter.
 * Même construction que l'accroche des annonces.
 */
export default function ForumIntro() {
  const { t } = useTranslation('forum');
  const { isAuthenticated } = useAuth();
  const memberAction = useMemberAction();
  const { data } = useForumOverview();

  const askClass = cn(
    'group/ask relative isolate inline-flex h-12 w-fit items-center gap-2 overflow-hidden rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
    'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_16px_34px_-12px_var(--kente-coral)]',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  );
  const askContent = (
    <>
      <PenLine aria-hidden className="size-4 transition-transform duration-500 ease-out-expo group-hover/ask:-rotate-12" />
      {t('intro.ask')}
      {/* Reflet qui traverse le bouton au survol */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/ask:translate-x-[400%] rtl:translate-x-full rtl:group-hover/ask:-translate-x-[400%]"
      />
    </>
  );

  return (
    <header className="grid gap-x-16 gap-y-7 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:pt-14 lg:pb-12">
      <div>
        <p className="eyebrow">{t('intro.eyebrow')}</p>
        <h1 className="mt-4 font-display text-h1">
          <span className="block">{t('intro.titleAsk')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('intro.titleShare')}</span>
        </h1>
      </div>

      <div className="flex flex-col gap-5 lg:pb-1.5">
        <p className="text-lead text-muted-foreground">{t('intro.lead')}</p>
        {/* Place gardée tant que les chiffres ne sont pas là : rien ne bouge à leur arrivée */}
        <p className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-soft-foreground">
          {data && (
            <>
              <span>{t('intro.topics', { count: data.topics })}</span>
              <Dot />
              <span>{t('intro.answers', { count: data.answers })}</span>
              {data.contributors > 0 && (
                <>
                  <Dot />
                  <span>{t('intro.contributors', { count: data.contributors })}</span>
                </>
              )}
              {data.solved > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                  {t('intro.solved', { count: data.solved })}
                </span>
              )}
              {data.unanswered > 0 && (
                <span className="inline-flex items-center gap-2 text-gold">
                  <span aria-hidden className="live-dot size-1.5 bg-kente-gold" />
                  {t('intro.unanswered', { count: data.unanswered })}
                </span>
              )}
            </>
          )}
        </p>
        {isAuthenticated ? (
          <Link
            to={paths.newTopic}
            viewTransition
            onPointerEnter={() => prefetch(pages.newTopic)}
            onFocus={() => prefetch(pages.newTopic)}
            className={askClass}
          >
            {askContent}
          </Link>
        ) : (
          <button type="button" onClick={() => memberAction('ask', () => undefined)} className={askClass}>
            {askContent}
          </button>
        )}
      </div>
    </header>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-faint-foreground">
      ·
    </span>
  );
}
