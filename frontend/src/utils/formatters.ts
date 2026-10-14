const LOCALE = 'fr';

const relativeTime = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const compactNumber = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const regionNames = new Intl.DisplayNames([LOCALE], { type: 'region' });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** « il y a 3 jours », « il y a 2 heures », « à l'instant ». Les dates de l'API sont en UTC. */
export function formatRelativeTime(isoDate: string): string {
  const seconds = Math.round((new Date(isoDate).getTime() - Date.now()) / 1000);
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTime.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return "à l'instant";
}

/** « 14 octobre 2026 » */
export function formatDate(isoDate: string): string {
  return fullDate.format(new Date(isoDate));
}

/** 1 240 → « 1,2 k » */
export function formatCount(value: number): string {
  return compactNumber.format(value);
}

/** Code ISO à 2 lettres → nom du pays en français (« SN » → « Sénégal »). */
export function countryName(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
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

/** « 1 réponse », « 3 réponses ». En français, 0 et 1 prennent le singulier. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count < 2 ? singular : plural}`;
}
