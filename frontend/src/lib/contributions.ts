/**
 * Graphe des contributions : une année vue en semaines (colonnes) de 7 jours (lignes), comme sur
 * GitHub. Fonctions pures : dates, grille, niveaux d'activité, statistiques, année type.
 *
 * Utilisé par le tissage kente de l'accueil (components/shared/KenteSkyline.tsx), qui reprend la
 * structure d'un vrai kente : chaque semaine est une bande tissée, chaque jour un bloc.
 */

export interface ContributionDay {
  /** AAAA-MM-JJ */
  date: string;
  count: number;
  /**
   * Niveau 0 à 4 déjà calculé par la source. Quand GitHub le fournit, on le garde : la grille a
   * alors exactement les mêmes nuances que le profil GitHub de la personne.
   */
  level?: number;
}

export interface ContributionCell {
  date: string;
  count: number;
  /** 0 : rien ce jour-là, 4 : jour le plus chargé */
  level: number;
  /** Colonne : semaine depuis le début de l'année affichée */
  week: number;
  /** Ligne : 0 pour dimanche (en haut, comme sur GitHub) */
  day: number;
}

export interface Streak {
  days: number;
  start: string | null;
  end: string | null;
}

export interface ContributionStats {
  total: number;
  busiest: { count: number; date: string | null };
  /** Plus longue suite de jours avec au moins une contribution */
  longest: Streak;
  /** Suite qui arrive jusqu'à aujourd'hui (ou hier : la journée n'est pas finie) */
  current: Streak;
}

export interface ContributionYear {
  cells: ContributionCell[];
  weeks: number;
  /** Plus grand nombre de contributions en un jour */
  max: number;
  stats: ContributionStats;
}

export const DAY_MS = 86_400_000;

/** Minuit UTC → « AAAA-MM-JJ » */
export const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** « AAAA-MM-JJ » lu tel quel (sans décalage de fuseau), ou Date lue dans le fuseau local → minuit UTC */
export function dayMs(value: string | Date): number {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    value = new Date(value);
  }
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Niveau 1 à 4 par quarts d'une « grosse journée » ; au-delà, 4. */
function levelOf(count: number, busy: number): number {
  if (count <= 0) {
    return 0;
  }
  return busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));
}

/**
 * Année qui se termine le jour `endMs`, en commençant au dimanche de la semaine d'il y a un an.
 * Niveaux : ceux de la source s'ils sont tous fournis ; sinon par quarts du 95e centile des jours
 * actifs, pour qu'un jour exceptionnel n'écrase pas tous les autres.
 */
export function buildYear(days: readonly ContributionDay[], endMs: number): ContributionYear {
  const byDate = new Map<string, { count: number; level?: number }>();
  let sourceLevels = days.length > 0;

  for (const day of days) {
    const ms = dayMs(day.date);
    const count = Number(day.count);
    if (!Number.isFinite(ms) || !Number.isFinite(count) || count < 0) {
      continue;
    }
    const key = toKey(ms);
    const previous = byDate.get(key);
    const level = typeof day.level === 'number' && day.level >= 0 && day.level <= 4 ? day.level : undefined;
    if (level === undefined) {
      sourceLevels = false;
    }
    byDate.set(key, { count: (previous?.count ?? 0) + count, level: level ?? previous?.level });
  }

  let start = endMs - 364 * DAY_MS;
  start -= new Date(start).getUTCDay() * DAY_MS;

  const cells: ContributionCell[] = [];
  for (let ms = start, index = 0; ms <= endMs; ms += DAY_MS, index++) {
    const date = toKey(ms);
    const entry = byDate.get(date);
    cells.push({
      date,
      count: entry?.count ?? 0,
      level: sourceLevels ? (entry?.level ?? 0) : 0,
      week: Math.floor(index / 7),
      day: index % 7,
    });
  }

  const active = cells
    .map((cell) => cell.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  if (!sourceLevels) {
    const busy = active.length > 0 ? active[Math.floor(0.95 * (active.length - 1))] : 0;
    for (const cell of cells) {
      cell.level = levelOf(cell.count, busy);
    }
  }

  return {
    cells,
    weeks: cells.length > 0 ? cells[cells.length - 1].week + 1 : 0,
    max: active.length > 0 ? active[active.length - 1] : 0,
    stats: computeStats(cells),
  };
}

export function computeStats(cells: readonly ContributionCell[]): ContributionStats {
  let total = 0;
  let busiest = { count: 0, date: null as string | null };
  let run = 0;
  let runStart: string | null = null;
  let longest: Streak = { days: 0, start: null, end: null };

  for (const cell of cells) {
    total += cell.count;
    if (cell.count > busiest.count) {
      busiest = { count: cell.count, date: cell.date };
    }
    if (cell.count > 0) {
      if (run === 0) {
        runStart = cell.date;
      }
      run++;
      if (run > longest.days) {
        longest = { days: run, start: runStart, end: cell.date };
      }
    } else {
      run = 0;
    }
  }

  // Série en cours : jusqu'à aujourd'hui, ou jusqu'à hier si rien n'est encore fait aujourd'hui
  let end = cells.length - 1;
  if (end >= 0 && cells[end].count === 0) {
    end--;
  }
  let first = end;
  while (first >= 0 && cells[first].count > 0) {
    first--;
  }
  const days = end - first;
  const current: Streak =
    days > 0 ? { days, start: cells[first + 1].date, end: cells[end].date } : { days: 0, start: null, end: null };

  return { total, busiest, longest, current };
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine, même année */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Année type d'un·e dev, pour l'accueil avant qu'un pseudo GitHub soit tissé : des week-ends plus
 * calmes, quelques périodes intenses (un hackathon, une mise en production), deux semaines de
 * vacances, et une activité qui monte au fil de l'année.
 */
export function sampleYear(endMs: number, seed = 2026): ContributionDay[] {
  const next = random(seed);
  const days = 371;
  const bursts = [
    { at: 0.18, width: 0.03, gain: 1.4 },
    { at: 0.47, width: 0.05, gain: 1.0 },
    { at: 0.83, width: 0.025, gain: 1.8 },
  ];
  const holidayStart = 0.62;
  const out: ContributionDay[] = [];
  let mood = 0.5;

  for (let i = 0; i < days; i++) {
    const ms = endMs - (days - 1 - i) * DAY_MS;
    const x = i / (days - 1);
    const weekday = new Date(ms).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;

    let heat = 0.25 + x * 0.55;
    for (const burst of bursts) {
      heat += burst.gain * Math.exp(-((x - burst.at) ** 2) / (2 * burst.width ** 2));
    }
    mood = mood * 0.82 + next() * 0.18;
    heat *= 0.6 + mood * 0.8;

    const onHoliday = x > holidayStart && x < holidayStart + 0.04;
    const chance = onHoliday ? 0.04 : Math.min(0.95, (weekend ? 0.25 : 0.55) + heat * 0.35);
    let count = 0;
    if (next() < chance) {
      count = 1 + Math.floor(-Math.log(1 - next()) * (1.1 + heat * 6) * (weekend ? 0.55 : 1));
    }
    out.push({ date: toKey(ms), count });
  }
  return out;
}

/** Une étiquette par semaine qui commence un mois ; une première étiquette trop serrée est retirée. */
export function monthLabels(
  cells: readonly ContributionCell[],
  weeks: number,
  locales: string | readonly string[],
): Array<{ week: number; label: string }> {
  const format = new Intl.DateTimeFormat(locales as string[], { month: 'short', timeZone: 'UTC' });
  const out: Array<{ week: number; label: string }> = [];
  let previous = -1;
  for (let week = 0; week < weeks; week++) {
    const cell = cells[week * 7];
    if (!cell) {
      break;
    }
    const month = Number(cell.date.slice(5, 7));
    if (month !== previous) {
      out.push({ week, label: format.format(dayMs(cell.date)) });
    }
    previous = month;
  }
  if (out.length > 1 && out[1].week - out[0].week < 3) {
    out.shift();
  }
  return out;
}
