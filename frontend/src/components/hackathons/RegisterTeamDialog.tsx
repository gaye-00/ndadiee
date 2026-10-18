import { AlertCircle, ArrowRight, Check, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import TeamMark from './TeamMark';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useAuth } from '@/hooks/useAuth';
import { useHackathonTeams, useRegisterTeam } from '@/hooks/useHackathons';
import { useProjects } from '@/hooks/useProjects';
import { displayTimeZone, formatInZone } from '@/lib/hackathonTime';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Hackathon } from '@/types/hackathon.types';
import type { Project } from '@/types/project.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { isolate } from '@/utils/formatters';

// Longueur du pitch (HackathonTeamRequest.java)
const MAX_PITCH = 280;
// Projets proposés : ceux du membre, une page suffit
const MY_PROJECTS = 50;

interface RegisterTeamDialogProps {
  hackathon: Hackathon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Inscription d'une équipe : le membre choisit l'un de ses projets (ses membres participent, ses rôles
 * ouverts recrutent pour le hackathon) et dit en une phrase ce que l'équipe va construire. Un projet déjà
 * inscrit, ou trop grand pour le hackathon, ne se choisit pas. Feuille en bas de l'écran sur téléphone,
 * fenêtre centrée ailleurs.
 */
export default function RegisterTeamDialog({ hackathon, open, onOpenChange }: RegisterTeamDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {open && <RegisterContent hackathon={hackathon} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RegisterContent({ hackathon }: { hackathon: Hackathon }) {
  const { t } = useTranslation('hackathons');
  const { user } = useAuth();
  const projects = useProjects(user ? { owner: user.username, size: MY_PROJECTS } : undefined);
  const teams = useHackathonTeams(hackathon.id);
  const register = useRegisterTeam(hackathon.id);
  const [chosen, setChosen] = useState<number | null>(null);
  const [pitch, setPitch] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Project | null>(null);
  const pitchId = useId();
  const { zone } = displayTimeZone(hackathon);

  const registeredIds = new Set((teams.data ?? []).map((team) => team.project.id));
  const mine = projects.data?.content ?? [];
  const reasonOf = (project: Project): string | null => {
    if (registeredIds.has(project.id)) {
      return t('register.alreadyIn');
    }
    if (project.memberCount > hackathon.maxTeamSize) {
      return t('register.tooBig', { count: project.memberCount, max: hackathon.maxTeamSize });
    }
    return null;
  };
  const selected = mine.find((project) => project.id === chosen && reasonOf(project) === null) ?? null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || register.isPending) {
      return;
    }
    setFailure(null);
    register.mutate(
      { projectId: selected.id, pitch: pitch.trim() || undefined },
      {
        onSuccess: () => setRegistered(selected),
        onError: (error) => setFailure(getApiErrorMessage(error)),
      },
    );
  }

  return (
    <div className="relative p-5 sm:p-6">
      {/* La poignée de la feuille, sur téléphone */}
      <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
      <Dialog.Close
        aria-label={t('register.close')}
        className="absolute end-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <X aria-hidden className="size-4.5" />
      </Dialog.Close>

      <AnimatePresence mode="wait" initial={false}>
        {registered ? (
          <m.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 px-2 pt-4 pb-2 text-center"
          >
            <span aria-hidden className="relative grid size-16 place-items-center">
              <TeamMark project={registered} size="lg" />
              <span className="absolute -end-1 -bottom-1 grid size-7 place-items-center rounded-full bg-jade text-kente-night ring-4 ring-popover">
                <Check className="size-4" strokeWidth={3} />
              </span>
            </span>
            <Dialog.Title className="font-display text-h5">
              {t('register.doneTitle', { team: isolate(registered.name) })}
            </Dialog.Title>
            <Dialog.Description className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('register.doneText', { hackathon: isolate(hackathon.title) })}
            </Dialog.Description>
            <Dialog.Close className="mt-2 inline-flex h-11 items-center rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night outline-none transition-[translate] hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover">
              {t('register.close')}
            </Dialog.Close>
          </m.div>
        ) : (
          <m.form key="form" onSubmit={submit} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5">
            <div className="pe-10">
              <p className="eyebrow">{hackathon.title}</p>
              <Dialog.Title className="mt-1 font-display text-h5">{t('register.title')}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('register.intro', {
                  min: hackathon.minTeamSize,
                  max: hackathon.maxTeamSize,
                  date: formatInZone('day', hackathon.registrationClosesAt, zone),
                })}
              </Dialog.Description>
            </div>

            {projects.isPending ? (
              <div className="flex flex-col gap-2" aria-busy>
                <span className="sr-only">{t('register.loading')}</span>
                {[0, 1].map((index) => (
                  <span key={index} className="h-[4.25rem] rounded-2xl skeleton-shimmer" />
                ))}
              </div>
            ) : mine.length === 0 ? (
              <NoProject />
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">{t('register.project')}</legend>
                {mine.map((project) => {
                  const reason = reasonOf(project);
                  return (
                    <label
                      key={project.id}
                      className={cn(
                        'group/option relative flex items-center gap-3.5 rounded-2xl border border-border p-3 pe-4 transition-[border-color,background-color,box-shadow] duration-300',
                        reason
                          ? 'cursor-not-allowed opacity-55'
                          : 'cursor-pointer hover:border-border-strong hover:bg-foreground/[0.025] has-checked:border-gold/60 has-checked:bg-gold/[0.06] has-checked:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_10%,transparent)] has-focus-visible:ring-2 has-focus-visible:ring-ring/70',
                      )}
                    >
                      <input
                        type="radio"
                        name="project"
                        value={project.id}
                        checked={chosen === project.id}
                        disabled={reason !== null}
                        onChange={() => setChosen(project.id)}
                        className="sr-only"
                      />
                      <TeamMark project={project} size="md" />
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block truncate text-start font-semibold text-foreground">
                          {project.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {reason ?? t('register.members', { count: project.memberCount })}
                        </span>
                      </span>
                      {/* La case, cochée quand le projet est choisi */}
                      <span
                        aria-hidden
                        className="grid size-5 shrink-0 place-items-center rounded-full border border-border-strong text-kente-night transition-colors group-has-checked/option:border-gold group-has-checked/option:bg-kente-gold"
                      >
                        <Check className="size-3 scale-0 transition-transform group-has-checked/option:scale-100" strokeWidth={3.5} />
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {mine.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={pitchId} className="text-sm font-semibold">
                    {t('register.pitch')}
                  </label>
                  <span className="text-xs text-faint-foreground">{t('register.optional')}</span>
                </div>
                <textarea
                  id={pitchId}
                  value={pitch}
                  onChange={(event) => setPitch(event.target.value.slice(0, MAX_PITCH))}
                  maxLength={MAX_PITCH}
                  rows={3}
                  dir="auto"
                  placeholder={t('register.pitchPlaceholder')}
                  className={cn(
                    'mt-2 block w-full resize-none rounded-xl border border-input bg-surface px-3.5 py-3 text-base leading-relaxed outline-none placeholder:text-faint-foreground/80 sm:text-[0.9375rem]',
                    'transition-[border-color,box-shadow] duration-300 focus:border-gold/55 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
                  )}
                />
                <p aria-hidden className="mt-1 text-end font-mono text-[0.6875rem] text-faint-foreground">
                  {pitch.length} / {MAX_PITCH}
                </p>
              </div>
            )}

            {failure && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-soft-foreground">
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-coral" />
                {failure}
              </p>
            )}

            {mine.length > 0 && (
              <button
                type="submit"
                disabled={!selected || register.isPending}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2.5 rounded-[0.875rem] bg-kente-warm px-5 text-[0.9375rem] font-bold text-kente-night outline-none transition-[translate,opacity,filter] duration-300',
                  'hover:-translate-y-px hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {register.isPending && <PulsatingDots size="sm" tone="current" label={t('register.sending')} />}
                {selected ? t('register.submitTeam', { team: isolate(selected.name) }) : t('register.submit')}
              </button>
            )}
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pas encore de projet : il en faut un pour former une équipe. */
function NoProject() {
  const { t } = useTranslation('hackathons');

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border-strong p-5">
      <span aria-hidden className="mb-1 size-10 rounded-xl bg-kente-conic opacity-80" />
      <p className="font-bold text-foreground">{t('register.noProjectTitle')}</p>
      <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{t('register.noProjectText')}</p>
      <Link
        to={paths.newProject}
        viewTransition
        className="group/new mt-1 inline-flex items-center gap-1.5 rounded-full text-[0.8125rem] font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {t('register.noProjectAction')}
        <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/new:translate-x-0.5 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
