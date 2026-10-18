import { Ban, Eye, EyeOff, Trash2, UserCheck, UserCog, type LucideIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { AdminAction, AdminActionType } from '@/types/admin.types';
import type { Role } from '@/types/user.types';
import { formatDateTime, formatRelativeTime, isolate } from '@/utils/formatters';

const LOOKS: Record<AdminActionType, { icon: LucideIcon; tone: string }> = {
  BLOCK_USER: { icon: Ban, tone: 'bg-coral/12 text-coral' },
  UNBLOCK_USER: { icon: UserCheck, tone: 'bg-jade/12 text-jade' },
  CHANGE_ROLE: { icon: UserCog, tone: 'bg-gold/12 text-gold' },
  HIDE_CONTENT: { icon: EyeOff, tone: 'bg-coral/12 text-coral' },
  UNHIDE_CONTENT: { icon: Eye, tone: 'bg-jade/12 text-jade' },
  DELETE_CONTENT: { icon: Trash2, tone: 'bg-coral/12 text-coral' },
};

// La phrase d'une décision : sur un compte, elle ne dépend que de l'action ; sur un contenu, aussi de son type
function sentenceKey(action: AdminAction) {
  return action.targetType === 'USER'
    ? (`journal.sentence.${action.action as 'BLOCK_USER' | 'UNBLOCK_USER' | 'CHANGE_ROLE'}` as const)
    : (`journal.sentence.${action.action as 'HIDE_CONTENT' | 'UNHIDE_CONTENT' | 'DELETE_CONTENT'}_${action.targetType}` as const);
}

const ROLES: readonly Role[] = ['USER', 'MODERATOR', 'ADMIN'];

// « USER → MODERATOR » : les deux rôles, s'ils sont connus
function roleChange(detail: string | null): [Role, Role] | null {
  const [from, to] = (detail ?? '').split('→').map((part) => part.trim() as Role);
  return ROLES.includes(from) && ROLES.includes(to) ? [from, to] : null;
}

interface ActionListProps {
  actions: AdminAction[];
  /** Sur la vue d'ensemble : le motif tient sur une ligne */
  compact?: boolean;
  className?: string;
}

/**
 * Des décisions de l'administration, les plus récentes d'abord : qui a fait quoi, sur quoi, pourquoi, et quand
 * (l'instant exact au survol de la date). Une décision sur un compte mène à ce compte dans le back-office.
 */
export default function ActionList({ actions, compact = false, className }: ActionListProps) {
  const { t } = useTranslation('admin');

  return (
    <ol className={cn('flex flex-col', className)}>
      {actions.map((action) => {
        const { icon: Icon, tone } = LOOKS[action.action];
        const roles = action.action === 'CHANGE_ROLE' ? roleChange(action.detail) : null;
        const admin = action.admin?.fullName ?? t('journal.formerAdmin');
        return (
          <li key={action.id} className="flex gap-3 border-b border-border-subtle py-3.5 last:border-b-0">
            <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-full', tone)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-soft-foreground">
                <Trans
                  t={t}
                  i18nKey={sentenceKey(action)}
                  values={{
                    admin: isolate(admin),
                    target: isolate(action.targetLabel),
                    from: roles ? t(`roles.${roles[0]}`) : '',
                    to: roles ? t(`roles.${roles[1]}`) : '',
                  }}
                  components={{ b: <strong className="font-semibold text-foreground" /> }}
                />
              </p>
              {action.reason && (
                <p className={cn('mt-1 text-[0.8125rem] text-muted-foreground', compact && 'truncate')}>
                  <span className="sr-only">{t('journal.reason')} </span>« {action.reason} »
                </p>
              )}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] text-faint-foreground">
                <time dateTime={action.createdAt} title={formatDateTime(action.createdAt)}>
                  {formatRelativeTime(action.createdAt)}
                </time>
                {action.targetType === 'USER' && (
                  <Link
                    to={`${paths.adminUsers}?q=${encodeURIComponent(action.targetLabel)}`}
                    viewTransition
                    className="rounded font-sans text-xs font-semibold text-gold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    {t('journal.seeAccount')}
                  </Link>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
