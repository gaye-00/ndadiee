import { Check, Copy, Plus, Share2, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import whatsapp from 'simple-icons/icons/whatsapp.svg?raw';
import { toast } from 'sonner';
import { useTeamLabels } from './labels';
import { useWorkspaceContext } from './workspaceContext';
import { dialogContent, dialogOverlay, ease, focusRing, iconButton, outlineButton } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useDecideMember, useProject, useProjectMembers } from '@/hooks/useProjects';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project, ProjectMember } from '@/types/project.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

// Le logo de WhatsApp (Simple Icons, licence CC0) : le réseau le plus utilisé sur le continent
const WHATSAPP_PATH = / d="([^"]+)"/.exec(whatsapp)?.[1] ?? '';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * « Inviter » : agrandir l'équipe. Sur Ndadiee, on rejoint une équipe en postulant à un de ses rôles, par son issue
 * « premier pas » : on partage donc le lien des rôles ouverts (copié, sur WhatsApp, ou par le partage du téléphone).
 * Pour le porteur et les mainteneurs, les candidatures qui attendent s'étudient ici même.
 */
export default function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogOverlay} />
        <Dialog.Content className={dialogContent('sm:w-[min(36rem,calc(100vw-2rem))]')}>{open && <InviteContent />}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InviteContent() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const project = useProject(slug);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7">
      <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{workspace.project.name}</p>
          <Dialog.Title className="mt-1 font-display text-h5">{t('invite.title')}</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('invite.text')}</Dialog.Description>
        </div>
        <Dialog.Close aria-label={t('dialog.close')} className={cn(iconButton, '-me-2 -mt-1')}>
          <X aria-hidden className="size-4.5" />
        </Dialog.Close>
      </div>

      <ShareLink />

      {project.isPending ? (
        <div className="mt-6 grid h-24 place-items-center">
          <PulsatingDots label={t('invite.loading')} />
        </div>
      ) : project.data ? (
        <>
          {workspace.canManage && <Applications project={project.data} />}
          <OpenRoles project={project.data} />
        </>
      ) : null}
    </div>
  );
}

/** Le lien des rôles ouverts, à copier ou partager */
function ShareLink() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${paths.projectRoles(slug)}`;
  const message = t('invite.message', { project: workspace.project.name });
  const native = typeof navigator.share === 'function';

  async function copy() {
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t('invite.copyFailed'));
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-border-subtle bg-foreground/[0.02] p-3.5">
      <p className="text-sm font-semibold">{t('invite.linkLabel')}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label={t('invite.linkLabel')}
          onFocus={(event) => event.currentTarget.select()}
          dir="ltr"
          className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-surface px-3 font-mono text-xs text-soft-foreground outline-none focus:border-gold/55"
        />
        <button type="button" onClick={() => void copy()} className={cn(outlineButton, 'h-10 w-28')}>
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={copied ? 'copied' : 'copy'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease }}
              className={cn('inline-flex items-center gap-1.5', copied && 'text-jade')}
            >
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {copied ? t('invite.copied') : t('invite.copy')}
            </m.span>
          </AnimatePresence>
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? t('invite.copied') : ''}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('inline-flex h-9 items-center gap-2 rounded-xl bg-jade/10 px-3 text-[0.8125rem] font-bold text-jade transition-colors hover:bg-jade/15', focusRing)}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
            <path d={WHATSAPP_PATH} />
          </svg>
          {t('invite.whatsapp')}
        </a>
        {native && (
          <button
            type="button"
            onClick={() => void navigator.share({ title: workspace.project.name, text: message, url }).catch(() => undefined)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-xl bg-foreground/6 px-3 text-[0.8125rem] font-bold text-soft-foreground transition-colors hover:bg-foreground/10 hover:text-foreground', focusRing)}
          >
            <Share2 aria-hidden className="size-4" />
            {t('invite.share')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Les rôles que l'équipe cherche : ce que le lien montrera */
function OpenRoles({ project }: { project: Project }) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();

  return (
    <section aria-labelledby="invite-roles" className="mt-6">
      <div className="flex items-center gap-3">
        <h3 id="invite-roles" className="eyebrow">
          {t('invite.roles', { count: project.openings.length })}
        </h3>
        <span aria-hidden className="h-px flex-1 bg-linear-to-r from-border to-transparent rtl:bg-linear-to-l" />
        <Link to={paths.workspaceRoles(slug)} viewTransition className={cn('rounded-md text-xs font-bold text-gold hover:underline hover:underline-offset-4', focusRing)}>
          {t('invite.manageRoles')}
        </Link>
      </div>
      {project.openings.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border-strong p-4">
          <p className="min-w-0 flex-1 basis-48 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('invite.noRoles')}</p>
          <Link to={paths.newOpening} viewTransition className={cn(outlineButton, 'h-9 px-3 text-[0.8125rem]')}>
            <Plus aria-hidden className="size-4" />
            {t('invite.publishRole')}
          </Link>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {project.openings.map((opening) => {
            const role = roleOf(opening.role);
            return (
              <li key={opening.id} className="flex items-center gap-3 rounded-xl border border-border-subtle px-3 py-2.5">
                {role && (
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground/5">
                    <WovenMotif motif={role.motif} colors={role.colors} className="h-5 w-auto" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-sm font-semibold text-foreground">
                    {opening.title}
                  </span>
                  {opening.starterIssueNumber && (
                    <span className="block truncate font-mono text-[0.6875rem] text-muted-foreground">
                      {t('invite.starter', { number: opening.starterIssueNumber, title: opening.starterIssueTitle ?? '' })}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold">{t('invite.seats', { count: opening.seats })}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Les candidatures qui attendent : les accepter fait entrer dans l'équipe (et dans cet espace) */
function Applications({ project }: { project: Project }) {
  const { t } = useTranslation('workspace');
  const members = useProjectMembers(project.id);
  const pending = members.data?.filter((member) => member.status === 'PENDING') ?? [];

  if (members.isPending || pending.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="invite-applications" className="mt-6">
      <div className="flex items-center gap-3">
        <h3 id="invite-applications" className="eyebrow flex items-center gap-2">
          {t('invite.applications')}
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.625rem] leading-none tracking-normal text-white tabular-nums">
            {pending.length}
          </span>
        </h3>
        <span aria-hidden className="h-px flex-1 bg-linear-to-r from-border to-transparent rtl:bg-linear-to-l" />
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {pending.map((member) => (
            <m.li key={member.id} layout exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
              <Application project={project} member={member} />
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function Application({ project, member }: { project: Project; member: ProjectMember }) {
  const { t } = useTranslation('workspace');
  const labels = useTeamLabels();
  const decide = useDecideMember(project.id);
  const [choice, setChoice] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const opening = project.openings.find((candidate) => candidate.id === member.openingId);
  const name = member.user.fullName;

  function answer(status: 'ACCEPTED' | 'REJECTED') {
    setChoice(status);
    decide.mutate(
      { memberId: member.id, decision: { status } },
      {
        onSuccess: () => toast.success(status === 'ACCEPTED' ? t('invite.accepted', { name: isolate(name) }) : t('invite.declined', { name: isolate(name) })),
        onSettled: () => setChoice(null),
      },
    );
  }

  return (
    <article className="rounded-2xl border border-border-subtle p-3.5">
      <div className="flex items-start gap-3">
        <UserAvatar user={member.user} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {opening ? t('invite.appliedTo', { role: isolate(opening.title) }) : member.specialty ? labels.specialty(member.specialty) : t('invite.appliedNoRole')}
            {' · '}
            <time dateTime={member.createdAt}>{formatRelativeTime(member.createdAt)}</time>
          </p>
        </div>
      </div>
      {member.motivation && (
        <p dir="auto" className="mt-2.5 line-clamp-3 border-s-2 border-gold/40 ps-3 text-start text-[0.8125rem] leading-relaxed text-soft-foreground">
          {member.motivation}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={decide.isPending}
          onClick={() => answer('REJECTED')}
          className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-bold text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground disabled:opacity-60', focusRing)}
        >
          {choice === 'REJECTED' && <PulsatingDots size="sm" tone="current" />}
          {t('invite.decline')}
        </button>
        <button
          type="button"
          disabled={decide.isPending}
          onClick={() => answer('ACCEPTED')}
          className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl bg-jade px-3.5 text-[0.8125rem] font-bold text-white shadow-[0_8px_20px_-12px_var(--jade)] transition-[translate,opacity] hover:-translate-y-px disabled:opacity-60', focusRing)}
        >
          {choice === 'ACCEPTED' ? <PulsatingDots size="sm" tone="current" /> : <Check aria-hidden className="size-4" strokeWidth={3} />}
          {t('invite.accept')}
        </button>
      </div>
    </article>
  );
}
