import type { EventRecord } from '../types';
import { parseDate } from './date';

/** Duração padrão de um rolê quando o anfitrião não informa o fim. */
const DEFAULT_DURATION_HOURS = 3;

function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

function stamp(d: Date): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
  );
}

export function eventStart(ev: Pick<EventRecord, 'date' | 'time'>): Date {
  const d = parseDate(ev.date);
  const [h, m] = ev.time.split(':').map((p) => parseInt(p, 10));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
}

export function eventEnd(ev: Pick<EventRecord, 'date' | 'time'>): Date {
  return new Date(eventStart(ev).getTime() + DEFAULT_DURATION_HOURS * 3600000);
}

export function icsDateStart(ev: Pick<EventRecord, 'date' | 'time'>): string {
  return stamp(eventStart(ev));
}

export function icsDateEnd(ev: Pick<EventRecord, 'date' | 'time'>): string {
  return stamp(eventEnd(ev));
}

export function escapeICS(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildICS(ev: EventRecord): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Galera//PT-BR//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@galera.app`,
    `DTSTART:${icsDateStart(ev)}`,
    `DTEND:${icsDateEnd(ev)}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    `LOCATION:${escapeICS(ev.location)}`,
    `DESCRIPTION:${escapeICS(ev.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalUrl(ev: EventRecord): string {
  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(ev.title)}`,
    `dates=${icsDateStart(ev)}/${icsDateEnd(ev)}`,
    `details=${encodeURIComponent(ev.description || '')}`,
    `location=${encodeURIComponent(ev.location)}`,
  ];
  return `https://calendar.google.com/calendar/render?${params.join('&')}`;
}
