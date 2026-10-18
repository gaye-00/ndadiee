import type { Hackathon } from '@/types/hackathon.types';
import { countryName } from '@/utils/formatters';

/** Instant au format des agendas, en UTC : « 20261120T180000Z ». */
function stamp(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Texte d'un champ d'agenda : barres obliques, virgules, points-virgules et retours à la ligne échappés. */
function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (char) => `\\${char}`);
}

/**
 * Ligne pliée tous les 75 octets, comme le veut le format (RFC 5545) : la suite repart sur une ligne qui
 * commence par une espace. Un caractère n'est jamais coupé en deux.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // L'espace de la ligne suivante compte dans ses 75 octets
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/**
 * Télécharge le hackathon en fichier d'agenda (.ics) : son début, sa fin, son lieu, et son adresse sur la
 * plateforme. L'agenda le place tout seul dans le fuseau de la personne.
 *
 * @param url adresse complète de la page du hackathon
 * @param online libellé du lieu d'un hackathon en ligne, dans la langue de l'interface
 */
export function downloadCalendarFile(hackathon: Hackathon, url: string, online: string): void {
  const place = hackathon.city ? [hackathon.city, countryName(hackathon.country)].filter(Boolean).join(', ') : online;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ndadiee//Hackathons//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:hackathon-${hackathon.id}@ndadiee`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(hackathon.startsAt)}`,
    `DTEND:${stamp(hackathon.endsAt)}`,
    `SUMMARY:${escape(hackathon.title)}`,
    `DESCRIPTION:${escape([hackathon.tagline, url].filter(Boolean).join('\n'))}`,
    `LOCATION:${escape(place)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${hackathon.slug}.ics`;
  link.click();
  // Le temps que le téléchargement parte avant de libérer le fichier
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
