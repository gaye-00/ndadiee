import { ArrowUpRight, CircleDot, Minus, Plus, Trash2, UsersRound } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from './FormSection';
import { inputClass } from './formStyles';
import { draftId, LIMITS, type DraftErrors, type DraftRole } from './projectDraft';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf, teamRoles, type RoleDefinition } from '@/config/roles';
import { cn } from '@/lib/utils';
import { parseGithubRepository } from '@/services/github.service';
import type { TeamRole } from '@/types/project.types';

interface RolesEditorProps {
  id: string;
  recruiting: boolean;
  roles: DraftRole[];
  /** Le dépôt du projet : l'issue « premier pas » d'un rôle en est une issue */
  repositoryUrl: string;
  onChange: (change: { recruiting?: boolean; roles?: DraftRole[] }) => void;
  errors: DraftErrors;
}

const toTeamRole = (role: RoleDefinition) => role.id.toUpperCase() as TeamRole;

/**
 * L'équipe : le projet cherche-t-il des contributeurs, et pour quels rôles ? Chaque métier du catalogue a son motif
 * tissé ; choisi, il devient une annonce du projet (intitulé, places, ce qu'on attend, issue « premier pas » pour
 * commencer), publiée avec lui et visible sur la page des annonces.
 */
export default function RolesEditor({ id, recruiting, roles, repositoryUrl, onChange, errors }: RolesEditorProps) {
  const { t } = useTranslation('projectForm');
  const { t: tc } = useTranslation();
  const full = roles.length >= LIMITS.roles;

  function add(definition: RoleDefinition) {
    if (full) {
      return;
    }
    const role: DraftRole = {
      id: draftId(),
      role: toTeamRole(definition),
      title: tc(`teamRoles.${definition.id}`),
      description: '',
      seats: 1,
      starterIssueNumber: '',
      starterIssueTitle: '',
    };
    onChange({ roles: [...roles, role] });
    requestAnimationFrame(() => document.getElementById(`role-${role.id}-title`)?.focus());
  }

  function update(roleId: string, change: Partial<DraftRole>) {
    onChange({ roles: roles.map((role) => (role.id === roleId ? { ...role, ...change } : role)) });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Recrute-t-on ? ── */}
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors duration-300 sm:p-5',
          recruiting ? 'border-jade/35 bg-jade/6' : 'border-border hover:border-border-strong',
        )}
      >
        <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl transition-colors', recruiting ? 'bg-jade/15 text-jade' : 'bg-foreground/6 text-muted-foreground')}>
          <UsersRound className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span id={`${id}-label`} className="flex items-center gap-2 font-semibold text-foreground">
            {t('team.recruiting')}
            {recruiting && <span aria-hidden className="live-dot size-1.5" />}
          </span>
          <span id={`${id}-description`} className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted-foreground">
            {t(recruiting ? 'team.recruitingOn' : 'team.recruitingOff')}
          </span>
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={recruiting}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-description`}
          onClick={() => onChange({ recruiting: !recruiting })}
          className={cn(
            'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            recruiting ? 'bg-jade' : 'bg-foreground/20',
          )}
        >
          <span aria-hidden className={cn('size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out-expo', recruiting ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0')} />
        </button>
      </label>

      <AnimatePresence initial={false}>
        {recruiting && (
          <m.div
            key="roles"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="-mx-2 overflow-hidden px-2"
          >
            <div className="flex flex-col gap-5 pt-1 pb-1">
              {/* ── Les rôles choisis ── */}
              <ol aria-label={t('team.chosen')} className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {roles.map((role, index) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      index={index}
                      repositoryUrl={repositoryUrl}
                      errors={errors}
                      onChange={(change) => update(role.id, change)}
                      onRemove={() => onChange({ roles: roles.filter((other) => other.id !== role.id) })}
                    />
                  ))}
                </AnimatePresence>
              </ol>

              {/* ── Le catalogue des métiers ── */}
              <div className="flex flex-col gap-2.5">
                <p id={`${id}-catalog`} className="flex items-baseline gap-3">
                  <span className="eyebrow">{t(roles.length === 0 ? 'team.catalogFirst' : 'team.catalog')}</span>
                  <span className="font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{`${roles.length}/${LIMITS.roles}`}</span>
                </p>
                <ul aria-labelledby={`${id}-catalog`} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {teamRoles.map((definition) => {
                    const count = roles.filter((role) => role.role === toTeamRole(definition)).length;
                    return (
                      <li key={definition.id}>
                        <button
                          type="button"
                          onClick={() => add(definition)}
                          disabled={full}
                          className={cn(
                            'group/role flex h-full w-full items-center gap-2.5 rounded-xl border p-2 pe-3 text-start outline-none transition-[border-color,background-color,translate] duration-300',
                            'hover:-translate-y-px hover:border-gold/40 hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-45',
                            count > 0 ? 'border-jade/35 bg-jade/5' : 'border-border',
                          )}
                        >
                          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/5">
                            <WovenMotif motif={definition.motif} colors={definition.colors} className="h-5 w-auto" />
                          </span>
                          <span className="min-w-0 flex-1 text-[0.8125rem] leading-tight font-semibold text-soft-foreground group-hover/role:text-foreground">
                            {tc(`teamRoles.${definition.id}`)}
                          </span>
                          {count > 0 ? (
                            <span className="shrink-0 font-mono text-[0.6875rem] text-jade">×{count}</span>
                          ) : (
                            <Plus aria-hidden className="size-3.5 shrink-0 text-faint-foreground transition-colors group-hover/role:text-gold" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {errors.roles && (
                  <p role="alert" className="text-xs text-coral">
                    {errors.roles}
                  </p>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RoleCardProps {
  role: DraftRole;
  index: number;
  repositoryUrl: string;
  errors: DraftErrors;
  onChange: (change: Partial<DraftRole>) => void;
  onRemove: () => void;
}

/** Un rôle recherché : son intitulé, ses places, ce qu'on attend, et l'issue par laquelle commencer. */
function RoleCard({ role, index, repositoryUrl, errors, onChange, onRemove }: RoleCardProps) {
  const { t } = useTranslation('projectForm');
  const { t: tc } = useTranslation();
  const fieldId = useId();
  const definition = roleOf(role.role);
  const prefix = `roles.${index}`;
  const fieldErrors = {
    title: errors[`${prefix}.title`],
    description: errors[`${prefix}.description`],
    seats: errors[`${prefix}.seats`],
    starterIssueNumber: errors[`${prefix}.starterIssueNumber`],
    starterIssueTitle: errors[`${prefix}.starterIssueTitle`],
  };
  const [issueOpen, setIssueOpen] = useState(() => role.starterIssueNumber !== '' || fieldErrors.starterIssueNumber !== undefined);
  const repository = parseGithubRepository(repositoryUrl);
  const issueUrl = repository && /^\d+$/.test(role.starterIssueNumber) ? `https://github.com/${repository.owner}/${repository.name}/issues/${role.starterIssueNumber}` : null;
  const titleId = `role-${role.id}-title`;

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface/50"
    >
      {definition && <span aria-hidden style={{ background: `var(--${definition.colors[0]})` }} className="absolute inset-y-0 start-0 w-1" />}
      <div className="flex flex-col gap-4 p-4 ps-5 sm:p-5 sm:ps-6">
        <div className="flex items-start gap-3">
          {definition && (
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-foreground/5 ring-1 ring-foreground/6 ring-inset">
              <WovenMotif motif={definition.motif} colors={definition.colors} className="h-6 w-auto" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{tc(`teamRoles.${role.role.toLowerCase() as Lowercase<TeamRole>}`)}</p>
            <label htmlFor={titleId} className="sr-only">
              {t('team.titleLabel')}
            </label>
            <input
              id={titleId}
              value={role.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder={t('team.titlePlaceholder')}
              maxLength={LIMITS.roleTitle + 20}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? `${titleId}-help` : undefined}
              dir="auto"
              className={cn(
                'mt-1 w-full rounded-lg bg-transparent font-display text-[1.125rem] text-foreground outline-none placeholder:text-faint-foreground/70',
                'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-4 focus-visible:ring-offset-surface',
              )}
            />
            {fieldErrors.title && (
              <p id={`${titleId}-help`} role="alert" className="mt-1 text-xs text-coral">
                {fieldErrors.title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('team.remove', { role: role.title || tc(`teamRoles.${role.role.toLowerCase() as Lowercase<TeamRole>}`) })}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-coral/10 hover:text-coral focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <FormField id={`${fieldId}-description`} label={t('team.descriptionLabel')} optional error={fieldErrors.description} count={[role.description.length, LIMITS.roleDescription]}>
            <textarea
              id={`${fieldId}-description`}
              value={role.description}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder={t('team.descriptionPlaceholder')}
              rows={2}
              maxLength={LIMITS.roleDescription + 50}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={`${fieldId}-description-help`}
              dir="auto"
              className={cn(inputClass(fieldErrors.description !== undefined), 'h-auto min-h-20 resize-y py-3 leading-relaxed')}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <span id={`${fieldId}-seats`} className="eyebrow">
              {t('team.seatsLabel')}
            </span>
            <div role="group" aria-labelledby={`${fieldId}-seats`} className="inline-flex h-12 items-center gap-1 self-start rounded-[0.875rem] border border-border bg-surface/60 p-1">
              <button
                type="button"
                onClick={() => onChange({ seats: Math.max(1, role.seats - 1) })}
                disabled={role.seats <= 1}
                aria-label={t('team.fewerSeats')}
                className="grid size-9 place-items-center rounded-[0.625rem] text-soft-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-35"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <output aria-live="polite" className="w-16 text-center text-sm font-semibold tabular-nums">
                {t('team.seats', { count: role.seats })}
              </output>
              <button
                type="button"
                onClick={() => onChange({ seats: Math.min(LIMITS.seats, role.seats + 1) })}
                disabled={role.seats >= LIMITS.seats}
                aria-label={t('team.moreSeats')}
                className="grid size-9 place-items-center rounded-[0.625rem] text-soft-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-35"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── L'issue « premier pas » ── */}
        <div className="rounded-xl border border-gold/20 bg-gold/5">
          <button
            type="button"
            aria-expanded={issueOpen}
            aria-controls={`${fieldId}-issue`}
            onClick={() => setIssueOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <CircleDot aria-hidden className="size-4 shrink-0 text-gold" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] font-semibold text-foreground">
                {role.starterIssueNumber ? t('team.issueSet', { number: role.starterIssueNumber }) : t('team.issueLabel')}
              </span>
              {!issueOpen && !role.starterIssueNumber && <span className="block text-xs text-muted-foreground">{t('team.issueHint')}</span>}
            </span>
            <span aria-hidden className={cn('text-lg leading-none text-muted-foreground transition-transform duration-300', issueOpen && 'rotate-45')}>
              +
            </span>
          </button>
          <AnimatePresence initial={false}>
            {issueOpen && (
              <m.div
                id={`${fieldId}-issue`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="grid gap-3 px-3.5 pb-3.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <FormField id={`${fieldId}-number`} label={t('team.issueNumber')} error={fieldErrors.starterIssueNumber}>
                    <div className="relative">
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3.5 grid place-items-center font-mono text-sm text-faint-foreground">
                        #
                      </span>
                      <input
                        id={`${fieldId}-number`}
                        inputMode="numeric"
                        value={role.starterIssueNumber}
                        onChange={(event) => onChange({ starterIssueNumber: event.target.value.replace(/[^\d]/g, '').slice(0, 9) })}
                        placeholder="12"
                        aria-invalid={fieldErrors.starterIssueNumber ? true : undefined}
                        aria-describedby={`${fieldId}-number-help`}
                        dir="ltr"
                        className={cn(inputClass(fieldErrors.starterIssueNumber !== undefined), 'ps-8 font-mono')}
                      />
                    </div>
                  </FormField>
                  <FormField
                    id={`${fieldId}-issue-title`}
                    label={t('team.issueTitle')}
                    error={fieldErrors.starterIssueTitle}
                    hint={
                      issueUrl ? (
                        <a
                          href={issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm font-mono text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
                        >
                          {issueUrl.replace('https://', '')}
                          <ArrowUpRight aria-hidden className="size-3 rtl:-scale-x-100" />
                        </a>
                      ) : undefined
                    }
                  >
                    <input
                      id={`${fieldId}-issue-title`}
                      value={role.starterIssueTitle}
                      onChange={(event) => onChange({ starterIssueTitle: event.target.value })}
                      placeholder={t('team.issueTitlePlaceholder')}
                      maxLength={LIMITS.issueTitle + 20}
                      disabled={!role.starterIssueNumber}
                      aria-invalid={fieldErrors.starterIssueTitle ? true : undefined}
                      aria-describedby={`${fieldId}-issue-title-help`}
                      dir="auto"
                      className={cn(inputClass(fieldErrors.starterIssueTitle !== undefined), 'disabled:opacity-50')}
                    />
                  </FormField>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </m.li>
  );
}
