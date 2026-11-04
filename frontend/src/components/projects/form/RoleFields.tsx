import { ArrowUpRight, CircleDot, Minus, Plus } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from './FormSection';
import { inputClass } from './formStyles';
import { LIMITS, type DraftRole } from './projectDraft';
import { cn } from '@/lib/utils';
import { parseGithubRepository } from '@/services/github.service';

/** Ce que ces champs modifient d'un rôle */
export type RoleFieldValues = Pick<DraftRole, 'description' | 'seats' | 'starterIssueNumber' | 'starterIssueTitle'>;

interface RoleFieldsProps {
  values: RoleFieldValues;
  errors: Partial<Record<'description' | 'starterIssueNumber' | 'starterIssueTitle', string>>;
  /** Le dépôt du projet : l'issue « premier pas » d'un rôle en est une issue */
  repositoryUrl: string;
  onChange: (change: Partial<RoleFieldValues>) => void;
}

/**
 * Ce qu'on attend d'un rôle, ses places et l'issue « premier pas » par laquelle commencer : les mêmes champs pour un
 * rôle du formulaire de projet (RolesEditor) et pour une annonce publiée seule (openings/OpeningForm).
 */
export default function RoleFields({ values, errors, repositoryUrl, onChange }: RoleFieldsProps) {
  const { t } = useTranslation('projectForm');
  const fieldId = useId();
  const [issueOpen, setIssueOpen] = useState(() => values.starterIssueNumber !== '' || errors.starterIssueNumber !== undefined);
  const repository = parseGithubRepository(repositoryUrl);
  const issueUrl =
    repository && /^\d+$/.test(values.starterIssueNumber)
      ? `https://github.com/${repository.owner}/${repository.name}/issues/${values.starterIssueNumber}`
      : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <FormField id={`${fieldId}-description`} label={t('team.descriptionLabel')} optional error={errors.description} count={[values.description.length, LIMITS.roleDescription]}>
          <textarea
            id={`${fieldId}-description`}
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder={t('team.descriptionPlaceholder')}
            rows={2}
            maxLength={LIMITS.roleDescription + 50}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={`${fieldId}-description-help`}
            dir="auto"
            className={cn(inputClass(errors.description !== undefined), 'h-auto min-h-20 resize-y py-3 leading-relaxed')}
          />
        </FormField>
        <div className="flex flex-col gap-2">
          <span id={`${fieldId}-seats`} className="eyebrow">
            {t('team.seatsLabel')}
          </span>
          <div role="group" aria-labelledby={`${fieldId}-seats`} className="inline-flex h-12 items-center gap-1 self-start rounded-[0.875rem] border border-border bg-surface/60 p-1">
            <button
              type="button"
              onClick={() => onChange({ seats: Math.max(1, values.seats - 1) })}
              disabled={values.seats <= 1}
              aria-label={t('team.fewerSeats')}
              className="grid size-9 place-items-center rounded-[0.625rem] text-soft-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-35"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <output aria-live="polite" className="w-16 text-center text-sm font-semibold tabular-nums">
              {t('team.seats', { count: values.seats })}
            </output>
            <button
              type="button"
              onClick={() => onChange({ seats: Math.min(LIMITS.seats, values.seats + 1) })}
              disabled={values.seats >= LIMITS.seats}
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
              {values.starterIssueNumber ? t('team.issueSet', { number: values.starterIssueNumber }) : t('team.issueLabel')}
            </span>
            {!issueOpen && !values.starterIssueNumber && <span className="block text-xs text-muted-foreground">{t('team.issueHint')}</span>}
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
                <FormField id={`${fieldId}-number`} label={t('team.issueNumber')} error={errors.starterIssueNumber}>
                  <div className="relative">
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3.5 grid place-items-center font-mono text-sm text-faint-foreground">
                      #
                    </span>
                    <input
                      id={`${fieldId}-number`}
                      inputMode="numeric"
                      value={values.starterIssueNumber}
                      onChange={(event) => onChange({ starterIssueNumber: event.target.value.replace(/[^\d]/g, '').slice(0, 9) })}
                      placeholder="12"
                      aria-invalid={errors.starterIssueNumber ? true : undefined}
                      aria-describedby={`${fieldId}-number-help`}
                      dir="ltr"
                      className={cn(inputClass(errors.starterIssueNumber !== undefined), 'ps-8 font-mono')}
                    />
                  </div>
                </FormField>
                <FormField
                  id={`${fieldId}-issue-title`}
                  label={t('team.issueTitle')}
                  error={errors.starterIssueTitle}
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
                    value={values.starterIssueTitle}
                    onChange={(event) => onChange({ starterIssueTitle: event.target.value })}
                    placeholder={t('team.issueTitlePlaceholder')}
                    maxLength={LIMITS.issueTitle + 20}
                    disabled={!values.starterIssueNumber}
                    aria-invalid={errors.starterIssueTitle ? true : undefined}
                    aria-describedby={`${fieldId}-issue-title-help`}
                    dir="auto"
                    className={cn(inputClass(errors.starterIssueTitle !== undefined), 'disabled:opacity-50')}
                  />
                </FormField>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
