import { currentLanguage } from '@/i18n';
import type { Hackathon } from '@/types/hackathon.types';

/**
 * Le temps d'un hackathon, vu du navigateur : où il en est à la seconde près (le statut de l'API date de la
 * réponse), ce qui reste avant la prochaine échéance, et ses dates lues dans le bon fuseau.
 */

type Dates = Pick<Hackathon, 'createdAt' | 'registrationClosesAt' | 'startsAt' | 'endsAt'>;

/**
 * - registration : inscriptions ouvertes
 * - full : il reste du temps, mais plus de place
 * - closed : inscriptions closes, en attendant le coup d'envoi
 * - live : en cours
 * - ended : terminé
 */
export type HackathonPhase = 'registration' | 'full' | 'closed' | 'live' | 'ended';

export function phaseOf(hackathon: Dates & Pick<Hackathon, 'registrationOpen'>, now: number): HackathonPhase {
  if (now >= Date.parse(hackathon.endsAt)) {
    return 'ended';
  }
  if (now >= Date.parse(hackathon.startsAt)) {
    return 'live';
  }
  if (now >= Date.parse(hackathon.registrationClosesAt)) {
    return 'closed';
  }
  // Avant la clôture, l'API dit s'il reste de la place
  return hackathon.registrationOpen ? 'registration' : 'full';
}

/** La prochaine échéance qui compte : la fin des inscriptions, le coup d'envoi, puis la fin. */
export function nextDeadline(hackathon: Dates, phase: HackathonPhase): string | null {
  switch (phase) {
    case 'registration':
      return hackathon.registrationClosesAt;
    case 'full':
    case 'closed':
      return hackathon.startsAt;
    case 'live':
      return hackathon.endsAt;
    case 'ended':
      return null;
  }
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Plus rien à attendre */
  done: boolean;
}

export function countdown(target: string, now: number): CountdownParts {
  const left = Math.max(0, Date.parse(target) - now);
  const seconds = Math.floor(left / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    done: left === 0,
  };
}

/** Jours qui restent avant une date, comptés comme sur un compte à rebours d'affiche (« J-32 ») : arrondis au-dessus. */
export function daysUntil(target: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(target) - now) / 86_400_000));
}

/**
 * Durée de l'événement, comme on l'annonce : en heures pour un compte rond de jours pleins jusqu'à 4 jours
 * (« 48 h », « 72 h »), en jours entamés sinon (du jeudi 9 h au samedi 18 h : « 3 jours »).
 */
export function durationOf(hackathon: Pick<Hackathon, 'startsAt' | 'endsAt'>): { unit: 'hours' | 'days'; count: number } {
  const hours = Math.round((Date.parse(hackathon.endsAt) - Date.parse(hackathon.startsAt)) / 3_600_000);
  return hours % 24 === 0 && hours <= 96 ? { unit: 'hours', count: hours } : { unit: 'days', count: Math.ceil(hours / 24) };
}

// ── Le métier : la bande tissée du hackathon (HackathonLoom) ──

/** Les étapes sur la bande, de gauche à droite (de droite à gauche en arabe) : de 0 à 1. */
export interface LoomLayout {
  /** Fin des inscriptions */
  closes: number;
  /** Coup d'envoi */
  starts: number;
}

// Part de la bande donnée aux inscriptions et à l'attente du coup d'envoi ; le hackathon prend le reste.
// Des parts fixes, et non le temps réel : 48 heures de hackathon ne seraient qu'un trait après un mois
// d'inscriptions.
const REGISTRATION_SHARE = 0.58;
const WAITING_SHARE = 0.08;

export function loomLayout(hackathon: Dates): LoomLayout {
  const waiting = Date.parse(hackathon.registrationClosesAt) < Date.parse(hackathon.startsAt) ? WAITING_SHARE : 0;
  return { closes: REGISTRATION_SHARE, starts: REGISTRATION_SHARE + waiting };
}

const between = (now: number, from: number, to: number) => (to <= from ? 1 : Math.min(1, Math.max(0, (now - from) / (to - from))));

/** Où en est le tissage : la part de la bande déjà tissée, de l'annonce (0) à la fin du hackathon (1). */
export function loomProgress(hackathon: Dates, now: number): number {
  const layout = loomLayout(hackathon);
  const announced = Date.parse(hackathon.createdAt);
  const closes = Date.parse(hackathon.registrationClosesAt);
  const starts = Date.parse(hackathon.startsAt);
  const ends = Date.parse(hackathon.endsAt);
  if (now >= starts) {
    return layout.starts + (1 - layout.starts) * between(now, starts, ends);
  }
  if (now >= closes) {
    return layout.closes + (layout.starts - layout.closes) * between(now, closes, starts);
  }
  return layout.closes * between(now, announced, closes);
}

/** Place d'un instant du hackathon sur la bande (un temps fort du programme). */
export function loomPosition(hackathon: Dates, instant: string): number {
  return loomProgress(hackathon, Date.parse(instant));
}

// ── Dates, dans le bon fuseau ──

/** Le fuseau du navigateur : celui de la personne qui regarde. */
export const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Le fuseau où lire les horaires : celui de la ville quand on s'y retrouve (sur place, ou sur place et en
 * ligne), celui de la personne qui regarde pour un hackathon entièrement en ligne.
 */
export function displayTimeZone(hackathon: Pick<Hackathon, 'format' | 'timezone'>): { zone: string; local: boolean } {
  return hackathon.format === 'REMOTE' ? { zone: viewerTimeZone, local: false } : { zone: hackathon.timezone, local: true };
}

/** « Africa/Abidjan » → « Abidjan » */
export function cityOfZone(zone: string): string {
  return (zone.split('/').pop() ?? zone).replaceAll('_', ' ');
}

type FormatKind = 'range' | 'day' | 'dayTime' | 'time' | 'monthYear' | 'stamp';

const OPTIONS: Record<FormatKind, Intl.DateTimeFormatOptions> = {
  // « 20–22 nov. »
  range: { day: 'numeric', month: 'short' },
  // « ven. 20 nov. »
  day: { weekday: 'short', day: 'numeric', month: 'short' },
  // « ven. 20 nov., 18:00 »
  dayTime: { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  // « 18:00 »
  time: { hour: '2-digit', minute: '2-digit' },
  // « nov. 2025 »
  monthYear: { month: 'short', year: 'numeric' },
  // Les morceaux du tampon de date d'une carte : jour, mois, jour de la semaine
  stamp: { weekday: 'short', day: 'numeric', month: 'short' },
};

// Intl est coûteux à créer : un formateur par langue, fuseau et forme
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(kind: FormatKind, timeZone: string): Intl.DateTimeFormat {
  const language = currentLanguage();
  const key = `${language.code}|${timeZone}|${kind}`;
  let entry = formatters.get(key);
  if (!entry) {
    entry = new Intl.DateTimeFormat([...language.intl], { ...OPTIONS[kind], timeZone });
    formatters.set(key, entry);
  }
  return entry;
}

export function formatInZone(kind: Exclude<FormatKind, 'range' | 'stamp'>, isoDate: string, timeZone: string): string {
  return formatter(kind, timeZone).format(new Date(isoDate));
}

/** « 20–22 nov. », « 30 nov. – 2 déc. » : le navigateur regroupe ce qui se répète. */
export function formatRangeInZone(startsAt: string, endsAt: string, timeZone: string): string {
  return formatter('range', timeZone).formatRange(new Date(startsAt), new Date(endsAt));
}

/** Le tampon de date d'une carte : « 20 », « nov. », « ven. », dans la langue de l'interface. */
export function dateStamp(isoDate: string, timeZone: string): { day: string; month: string; weekday: string } {
  const parts = formatter('stamp', timeZone).formatToParts(new Date(isoDate));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return { day: part('day'), month: part('month').replace(/\.$/, ''), weekday: part('weekday').replace(/\.$/, '') };
}
