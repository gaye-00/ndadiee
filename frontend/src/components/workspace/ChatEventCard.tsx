import type { TFunction } from 'i18next';
import { CalendarClock, Check, Pin, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceContext } from './workspaceContext';
import { focusRing } from './workspaceStyles';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useNow } from '@/hooks/useNow';
import { useAttendEvent } from '@/hooks/useWorkspace';
import { currentLanguage } from '@/i18n';
import { cn } from '@/lib/utils';
import type { TeamMessage } from '@/types/workspace.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

// « Bientôt » : l'appel se rejoint déjà un quart d'heure avant
const SOON = 15 * 60_000;

type Phase = 'upcoming' | 'soon' | 'live' | 'ended';

interface ChatEventCardProps {
  /** Un message EVENT */
  message: TeamMessage;
  /** Épinglé en haut de la discussion, ou à sa place dans le fil */
  variant: 'pinned' | 'inline';
}

/**
 * Événement de la discussion (pair programming à 15 h). Design 3E.
 *
 * Quand (« Aujourd'hui · 15:00 – 16:00 »), dans combien de temps, qui y sera, et « J'y serai ». Un quart d'heure avant,
 * l'appel se rejoint ; pendant, la carte s'anime d'un fil kente qui tourne. Le prochain rendez-vous reste épinglé en
 * haut de la discussion jusqu'à sa fin.
 */
export default function ChatEventCard({ message, variant }: ChatEventCardProps) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const { user } = useAuth();
  const now = useNow(30_000);
  const attend = useAttendEvent(slug);
  const event = message.event;
  if (!event) {
    return null;
  }

  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  const phase: Phase = now >= end ? 'ended' : now >= start ? 'live' : start - now <= SOON ? 'soon' : 'upcoming';
  const pinned = variant === 'pinned';
  const others = event.attendees.filter((person) => person.id !== user?.id);

  const card = (
    <div
      className={cn(
        'relative flex flex-col gap-2.5 rounded-[calc(1rem-1px)] p-3.5',
        pinned ? 'bg-surface' : 'border border-border-subtle bg-foreground/[0.02]',
        phase === 'ended' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
            phase === 'live' ? 'bg-jade/12 text-jade ring-jade/25' : 'bg-gold/12 text-gold ring-gold/20',
          )}
        >
          {pinned ? <Pin className="size-4" /> : <CalendarClock className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-mono text-[0.625rem] font-semibold tracking-[0.08em] text-faint-foreground uppercase">
            {pinned ? t('event.pinned') : t('event.label')}
            <Status phase={phase} startsAt={event.startsAt} />
          </p>
          <p dir="auto" className="mt-0.5 text-start text-sm leading-snug font-bold text-foreground">
            {message.body}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <time dateTime={event.startsAt}>{whenOf(event.startsAt, event.endsAt, t)}</time>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {event.attendees.length > 0 && (
          <span aria-hidden className="flex -space-x-1.5">
            {event.attendees.slice(0, 4).map((person) => (
              <UserAvatar key={person.id} user={person} size="sm" className="size-6 text-[0.5625rem] ring-2 ring-surface" />
            ))}
          </span>
        )}
        <p className="min-w-0 flex-1 basis-32 text-xs leading-snug text-muted-foreground">{attendeesSentence(event.attending, others.map((person) => person.fullName), t)}</p>

        <span className="flex shrink-0 gap-1.5">
          {phase !== 'ended' && (
            <button
              type="button"
              aria-pressed={event.attending}
              onClick={() => attend.mutate({ message, attending: !event.attending })}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors',
                event.attending ? 'bg-jade/12 text-jade hover:bg-jade/18' : 'border border-border-strong text-foreground hover:bg-foreground/5',
                focusRing,
              )}
            >
              {event.attending && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
              {event.attending ? t('event.attending') : t('event.attend')}
            </button>
          )}
          {event.link && phase !== 'ended' && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-[translate,background-color]',
                phase === 'live' || phase === 'soon'
                  ? 'bg-kente-warm text-kente-night shadow-[0_8px_20px_-12px_var(--kente-coral)] hover:-translate-y-px'
                  : 'text-gold hover:bg-gold/10',
                focusRing,
              )}
            >
              <Video aria-hidden className="size-3.5" />
              {t('event.join')}
            </a>
          )}
        </span>
      </div>
    </div>
  );

  // En cours, épinglé : le fil kente tourne autour
  return pinned ? <div className={cn('rounded-2xl', phase === 'live' ? 'border-kente-spin' : 'border border-gold/25 p-px')}>{card}</div> : card;
}

function Status({ phase, startsAt }: { phase: Phase; startsAt: string }) {
  const { t } = useTranslation('workspace');
  if (phase === 'live') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-jade/12 px-1.5 py-px tracking-normal text-jade normal-case">
        <span aria-hidden className="live-dot size-1.5" />
        {t('event.live')}
      </span>
    );
  }
  if (phase === 'ended') {
    return <span className="tracking-normal normal-case">{t('event.ended')}</span>;
  }
  return <span className={cn('tracking-normal normal-case', phase === 'soon' ? 'text-coral' : 'text-gold')}>{formatRelativeTime(startsAt)}</span>;
}

type Translate = TFunction<'workspace'>;

/** « Aujourd'hui · 15:00 – 16:00 », « Demain · 09:30 – 10:00 », « jeudi 6 novembre · 15:00 – 16:00 » */
function whenOf(startsAt: string, endsAt: string, t: Translate): string {
  const locales = [...currentLanguage().intl];
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(start, today)
    ? t('event.today')
    : sameDay(start, tomorrow)
      ? t('event.tomorrow')
      : new Intl.DateTimeFormat(locales, { weekday: 'long', day: 'numeric', month: 'long' }).format(start);
  const time = new Intl.DateTimeFormat(locales, { hour: '2-digit', minute: '2-digit' });
  return t('event.when', { day, start: time.format(start), end: time.format(end) });
}

/** « Tu y seras, avec Tunde et Ama », « Tunde, Ama et Chinedu y seront », « Personne n'a encore répondu » */
function attendeesSentence(attending: boolean, others: string[], t: Translate): string {
  const names = new Intl.ListFormat([...currentLanguage().intl], { type: 'conjunction' }).format(others.map(isolate));
  if (attending) {
    return others.length === 0 ? t('event.youAlone') : t('event.youWith', { names });
  }
  return others.length === 0 ? t('event.nobody') : t('event.others', { names, count: others.length });
}
