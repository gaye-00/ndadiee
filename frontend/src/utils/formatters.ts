import { currentLanguage } from '@/i18n';

interface Formatters {
  relativeTime: Intl.RelativeTimeFormat;
  fullDate: Intl.DateTimeFormat;
  month: Intl.DateTimeFormat;
  day: Intl.DateTimeFormat;
  compactNumber: Intl.NumberFormat;
  number: Intl.NumberFormat;
  shortDay: Intl.DateTimeFormat;
  dateTime: Intl.DateTimeFormat;
  regionNames: Intl.DisplayNames;
}

// Un jeu de formateurs par langue, créé à la première utilisation : Intl est coûteux à instancier
const formattersByLanguage = new Map<string, Formatters>();

/** Formateurs de la langue de l'interface (ou d'une langue proche si le navigateur ne la connaît pas). */
function formatters(): Formatters {
  const language = currentLanguage();
  let entry = formattersByLanguage.get(language.code);
  if (!entry) {
    const locales = [...language.intl];
    entry = {
      relativeTime: new Intl.RelativeTimeFormat(locales, { numeric: 'auto' }),
      fullDate: new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'long', year: 'numeric' }),
      month: new Intl.DateTimeFormat(locales, { month: 'long', year: 'numeric' }),
      day: new Intl.DateTimeFormat(locales, { weekday: 'long', day: 'numeric', month: 'long' }),
      compactNumber: new Intl.NumberFormat(locales, { notation: 'compact', maximumFractionDigits: 1 }),
      number: new Intl.NumberFormat(locales),
      // Un jour de l'API (« 2026-10-18 ») est une date UTC : lu en UTC, il ne recule pas d'un jour à l'ouest
      shortDay: new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      dateTime: new Intl.DateTimeFormat(locales, { dateStyle: 'long', timeStyle: 'short' }),
      regionNames: new Intl.DisplayNames(locales, { type: 'region' }),
    };
    formattersByLanguage.set(language.code, entry);
  }
  return entry;
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** « il y a 3 jours », « il y a 2 heures », « maintenant ». Les dates de l'API sont en UTC. */
export function formatRelativeTime(isoDate: string): string {
  const { relativeTime } = formatters();
  const seconds = Math.round((new Date(isoDate).getTime() - Date.now()) / 1000);
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTime.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return relativeTime.format(0, 'second');
}

/** « 14 octobre 2026 » */
export function formatDate(isoDate: string): string {
  return formatters().fullDate.format(new Date(isoDate));
}

/** « octobre 2025 » : depuis quand un membre est là */
export function formatMonth(isoDate: string): string {
  return formatters().month.format(new Date(isoDate));
}

/** « jeudi 16 octobre » : la date du jour, en tête d'un tableau de bord */
export function formatDay(date: Date): string {
  return formatters().day.format(date);
}

/**
 * Isole un nom dans une phrase traduite (« Flutter · 6 annonces ») : en arabe, le chiffre qui le suit
 * reste avec les mots de la phrase au lieu de se coller au nom latin. Caractères Unicode invisibles.
 */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`;
}

/** « 18 octobre 2026 à 16:04 » : l'instant exact, en infobulle d'une date relative */
export function formatDateTime(isoDate: string): string {
  return formatters().dateTime.format(new Date(isoDate));
}

/** « 18 oct. » : un jour de l'API, au format AAAA-MM-JJ (UTC) */
export function formatShortDay(isoDay: string): string {
  return formatters().shortDay.format(new Date(`${isoDay}T00:00:00Z`));
}

/** 1240 → « 1 240 » : un chiffre clé, en entier */
export function formatNumber(value: number): string {
  return formatters().number.format(value);
}

/** 1 240 → « 1,2 k » */
export function formatCount(value: number): string {
  return formatters().compactNumber.format(value);
}

/** Code ISO à 2 lettres → nom du pays dans la langue de l'interface (« SN » → « Sénégal »). */
export function countryName(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  try {
    return formatters().regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Code ISO à 2 lettres → drapeau emoji (« SN » → 🇸🇳). */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[a-zA-Z]{2}$/.test(code)) {
    return '';
  }
  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/** « Awa Diop » → « AD » : repli quand l'utilisateur n'a pas d'avatar. */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Markdown → texte brut sur une ligne, pour les aperçus dans les cartes. */
export function plainText(markdown: string | null | undefined): string {
  if (!markdown) {
    return '';
  }
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
