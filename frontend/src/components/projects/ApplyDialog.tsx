import { AlertCircle, ArrowUpRight, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchRing } from './OpenRoleCard';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useProjectMembership } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import type { Project, ProjectOpening } from '@/types/project.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { isolate } from '@/utils/formatters';

// Longueur du mot pour l'équipe (JoinProjectRequest.java)
const MAX_MOTIVATION = 500;

interface ApplyDialogProps {
  project: Project;
  /** Le rôle visé ; gardé après la fermeture, le temps que la fenêtre s'en aille */
  opening: ProjectOpening | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Candidature à un rôle : l'issue « premier pas » pour commencer, la compatibilité avec son profil, un
 * mot pour l'équipe. Envoyée, la fenêtre fête l'arrivée de la candidature. Feuille en bas de l'écran sur
 * téléphone, fenêtre centrée ailleurs.
 */
export default function ApplyDialog({ project, opening, open, onOpenChange }: ApplyDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {opening && <ApplyContent key={opening.id} project={project} opening={opening} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ApplyContent({ project, opening }: { project: Project; opening: ProjectOpening }) {
  const { t } = useTranslation();
  const membership = useProjectMembership();
  const [motivation, setMotivation] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const role = roleOf(opening.role);
  const issueUrl =
    opening.starterIssueNumber && project.repositoryUrl
      ? `${project.repositoryUrl.replace(/\/+$/, '')}/issues/${opening.starterIssueNumber}`
      : null;
  const owner = project.owner.fullName.split(/\s+/)[0] ?? project.owner.fullName;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (membership.isPending) {
      return;
    }
    setFailure(null);
    membership.mutate(
      { projectId: project.id, join: true, request: { openingId: opening.id, motivation: motivation.trim() || undefined } },
      {
        onSuccess: () => setSent(true),
        onError: (error) => {
          const message = getApiError(error)?.message ?? '';
          setFailure(/attente|pending/i.test(message) ? t('project.apply.alreadyPending') : getApiErrorMessage(error));
        },
      },
    );
  }

  return (
    <div className="relative p-5 sm:p-6">
      {/* La poignée de la feuille, sur téléphone */}
      <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
      <Dialog.Close
        aria-label={t('project.apply.close')}
        className="absolute end-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <X aria-hidden className="size-4.5" />
      </Dialog.Close>

      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <m.div
            key="sent"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 px-2 pt-4 pb-2 text-center"
          >
            <SuccessMark />
            <Dialog.Title className="font-display text-h5">{t('project.apply.doneTitle')}</Dialog.Title>
            <Dialog.Description className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('project.apply.doneText', { owner: isolate(owner) })}
            </Dialog.Description>
            <Dialog.Close className="mt-2 inline-flex h-11 items-center rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night outline-none transition-[translate] hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover">
              {t('project.apply.close')}
            </Dialog.Close>
          </m.div>
        ) : (
          <m.form key="form" onSubmit={submit} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5">
            {/* Le rôle */}
            <div className="flex items-start gap-3.5 pe-10">
              {role && (
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/6 ring-inset">
                  <WovenMotif motif={role.motif} colors={role.colors} className="h-7 w-auto" />
                </span>
              )}
              <div className="min-w-0">
                <p className="eyebrow">{project.name}</p>
                <Dialog.Title className="mt-1 font-display text-h5">{t('project.apply.title', { role: isolate(opening.title) })}</Dialog.Title>
              </div>
            </div>
            <Dialog.Description className="-mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('project.apply.intro', { project: isolate(project.name) })}
            </Dialog.Description>

            {/* L'issue « premier pas » */}
            {opening.starterIssueNumber && (
              <div className="flex items-center gap-3.5 rounded-2xl border border-gold/25 bg-gold/8 p-3.5">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-kente-gold font-mono text-sm font-bold text-kente-night">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-semibold text-foreground">{t('project.apply.step')}</p>
                  <p className="line-clamp-2 font-mono text-xs text-soft-foreground">
                    #{opening.starterIssueNumber} · <span dir="auto">{opening.starterIssueTitle}</span>
                  </p>
                </div>
                {issueUrl && (
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-gold outline-none hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    {t('project.apply.openIssue')}
                    <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
                  </a>
                )}
              </div>
            )}

            {/* Compatibilité avec son profil */}
            {opening.match && (
              <div className="flex items-center gap-3.5">
                <span className="relative grid size-12 shrink-0 place-items-center">
                  <MatchRing score={opening.match.score} className="absolute inset-0 size-12" />
                  <span className="font-mono text-xs font-bold text-jade">{opening.match.score}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-jade">{t('project.roles.match', { score: opening.match.score })}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {opening.match.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-jade/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-jade">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Le mot pour l'équipe */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={fieldId} className="text-sm font-semibold">
                  {t('project.apply.motivation')}
                </label>
                <span className="text-xs text-faint-foreground">{t('project.apply.optional')}</span>
              </div>
              <textarea
                id={fieldId}
                value={motivation}
                onChange={(event) => setMotivation(event.target.value.slice(0, MAX_MOTIVATION))}
                maxLength={MAX_MOTIVATION}
                rows={4}
                dir="auto"
                placeholder={t('project.apply.placeholder')}
                className={cn(
                  'mt-2 block w-full resize-none rounded-xl border border-input bg-surface px-3.5 py-3 text-base leading-relaxed outline-none placeholder:text-faint-foreground/80 sm:text-[0.9375rem]',
                  'transition-[border-color,box-shadow] duration-300 focus:border-gold/55 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
                )}
              />
              <p aria-hidden className="mt-1 text-end font-mono text-[0.6875rem] text-faint-foreground">
                {motivation.length} / {MAX_MOTIVATION}
              </p>
            </div>

            <AnimatePresence initial={false}>
              {failure && (
                <m.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <span className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
                    <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {failure}
                  </span>
                </m.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Dialog.Close className="inline-flex h-11 items-center justify-center rounded-[0.875rem] px-4 text-sm font-bold text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70">
                {t('actions.cancel')}
              </Dialog.Close>
              <button
                type="submit"
                aria-busy={membership.isPending || undefined}
                className="group/send relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] outline-none transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
              >
                {membership.isPending && <PulsatingDots size="sm" tone="current" />}
                {t(membership.isPending ? 'project.apply.pending' : 'project.apply.submit')}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// Les fils qui jaillissent autour de la coche, aux couleurs du kente
const THREADS = Array.from({ length: 10 }, (_, index) => ({
  angle: (index / 10) * Math.PI * 2 + 0.3,
  color: ['var(--kente-gold)', 'var(--kente-coral)', 'var(--kente-jade)'][index % 3],
}));

/** La coche de la candidature envoyée : un cercle qui se trace, la coche, et des fils kente qui jaillissent. */
function SuccessMark() {
  return (
    <span aria-hidden className="relative grid size-20 place-items-center">
      {THREADS.map((thread, index) => (
        <m.span
          key={index}
          className="absolute top-1/2 left-1/2 h-0.5 w-3 origin-left rounded-full"
          style={{ backgroundColor: thread.color, rotate: `${thread.angle}rad` }}
          initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.4 }}
          animate={{
            x: Math.cos(thread.angle) * 46,
            y: Math.sin(thread.angle) * 46,
            opacity: [0, 1, 0],
            scaleX: [0.4, 1.4, 0.6],
          }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <svg viewBox="0 0 64 64" className="size-20">
        <m.circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="var(--jade)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ rotate: -90, transformOrigin: 'center' }}
        />
        <m.path
          d="M21 33 l7 7 l15 -16"
          fill="none"
          stroke="var(--jade)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
        />
      </svg>
    </span>
  );
}
