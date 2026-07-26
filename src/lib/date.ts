export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** 'YYYY-MM-DD' -> Date local (evita o shift de fuso do `new Date('2026-08-14')`). */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10));
  return new Date(y, m - 1, d);
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function stubDate(dateStr: string): { wd: string; day: number; mon: string } {
  const d = parseDate(dateStr);
  return { wd: WEEKDAYS[d.getDay()], day: d.getDate(), mon: MONTHS[d.getMonth()] };
}

export function longDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_FULL[d.getMonth()]}`;
}

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const diffMs = parseDate(dateStr).getTime() - startOfToday(now).getTime();
  return Math.round(diffMs / 86400000);
}

export function relativeDays(dateStr: string, now: Date = new Date()): string {
  const diff = daysUntil(dateStr, now);
  if (diff === 0) return 'é hoje!';
  if (diff === 1) return 'é amanhã!';
  if (diff > 1) return `daqui a ${diff} dias`;
  if (diff === -1) return 'foi ontem';
  return 'já passou';
}

/** O álbum abre no dia do rolê. */
export function eventIsUnlocked(dateStr: string, now: Date = new Date()): boolean {
  return daysUntil(dateStr, now) <= 0;
}

/** 'há 2 dias', 'agora mesmo'... a partir de um ISO. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((now.getTime() - then) / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.round(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  return longDate(new Date(then).toISOString().slice(0, 10));
}
