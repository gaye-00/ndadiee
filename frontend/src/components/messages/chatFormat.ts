import { currentLanguage } from '@/i18n';

interface ChatFormatters {
  clock: Intl.DateTimeFormat;
  weekday: Intl.DateTimeFormat;
  dayMonth: Intl.DateTimeFormat;
  numericDate: Intl.DateTimeFormat;
  longDay: Intl.DateTimeFormat;
  longDayYear: Intl.DateTimeFormat;
  relative: Intl.RelativeTimeFormat;
}

// Un jeu de formateurs par langue, créé à la première utilisation : Intl est coûteux à instancier
const byLanguage = new Map<string, ChatFormatters>();

function formatters(): ChatFormatters {
  const language = currentLanguage();
  let entry = byLanguage.get(language.code);
  if (!entry) {
    const locales = [...language.intl];
    entry = {
      clock: new Intl.DateTimeFormat(locales, { hour: '2-digit', minute: '2-digit' }),
      weekday: new Intl.DateTimeFormat(locales, { weekday: 'short' }),
      dayMonth: new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'short' }),
      numericDate: new Intl.DateTimeFormat(locales, { day: '2-digit', month: '2-digit', year: '2-digit' }),
      longDay: new Intl.DateTimeFormat(locales, { weekday: 'long', day: 'numeric', month: 'long' }),
      longDayYear: new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'long', year: 'numeric' }),
      relative: new Intl.RelativeTimeFormat(locales, { numeric: 'auto' }),
    };
    byLanguage.set(language.code, entry);
  }
  return entry;
}

const DAY = 86_400_000;

// Les jours se comptent dans le fuseau du membre : un message de 23 h 50 est d'« hier » à 0 h 10
function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((dayStart(later) - dayStart(earlier)) / DAY);
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(currentLanguage().code) + text.slice(1);
}

export function isSameDay(a: string, b: string): boolean {
  return dayStart(new Date(a)) === dayStart(new Date(b));
}

/** « 14:05 » */
export function formatClock(iso: string): string {
  return formatters().clock.format(new Date(iso));
}

/** Dans la liste : « 14:05 » aujourd'hui, « hier », « lun. » cette semaine, « 12 oct. » cette année, « 12/10/25 » avant. */
export function formatListTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  const format = formatters();
  if (days <= 0) {
    return format.clock.format(date);
  }
  if (days === 1) {
    return format.relative.format(-1, 'day');
  }
  if (days < 7) {
    return format.weekday.format(date);
  }
  return date.getFullYear() === now.getFullYear() ? format.dayMonth.format(date) : format.numericDate.format(date);
}

/** Séparateur de jour du fil : « Aujourd'hui », « Hier », « Lundi 27 octobre », « 12 octobre 2025 ». */
export function formatDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  const format = formatters();
  if (days <= 0) {
    return capitalize(format.relative.format(0, 'day'));
  }
  if (days === 1) {
    return capitalize(format.relative.format(-1, 'day'));
  }
  return date.getFullYear() === now.getFullYear() ? capitalize(format.longDay.format(date)) : format.longDayYear.format(date);
}

/** Un message en une ligne, pour un aperçu : sans les marques du code, les espaces resserrés. */
export function messagePreview(body: string | null): string {
  if (!body) {
    return '';
  }
  return body
    .replace(/```[^\n`]*\n?/g, ' ')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Que des émojis, trois au plus : affichés en grand, sans bulle. @returns leur nombre, 0 sinon */
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|\s)+$/u;

export function emojiOnlyCount(body: string | null): number {
  if (!body || body.length > 32 || !EMOJI_ONLY.test(body)) {
    return 0;
  }
  const graphemes = [...new Intl.Segmenter().segment(body)].filter((part) => part.segment.trim() !== '').length;
  return graphemes <= 3 ? graphemes : 0;
}
