import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  eventIsUnlocked,
  longDate,
  parseDate,
  relativeDays,
  relativeTime,
  stubDate,
} from '../src/lib/date';

const NOW = new Date(2026, 6, 26, 15, 30); // 26/07/2026

describe('parseDate', () => {
  it('lê a data como local, sem o shift de fuso do construtor com string', () => {
    const d = parseDate('2026-08-14');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(14);
  });
});

describe('stubDate / longDate', () => {
  it('formata em pt-BR', () => {
    expect(stubDate('2026-08-14')).toEqual({ wd: 'sex', day: 14, mon: 'ago' });
    expect(longDate('2026-08-14')).toBe('sex, 14 de agosto');
  });
});

describe('daysUntil / relativeDays', () => {
  it('ignora a hora do dia ao contar os dias', () => {
    expect(daysUntil('2026-07-26', NOW)).toBe(0);
    expect(daysUntil('2026-07-27', NOW)).toBe(1);
    expect(daysUntil('2026-07-20', NOW)).toBe(-6);
  });

  it('descreve a distância em português', () => {
    expect(relativeDays('2026-07-26', NOW)).toBe('é hoje!');
    expect(relativeDays('2026-07-27', NOW)).toBe('é amanhã!');
    expect(relativeDays('2026-08-14', NOW)).toBe('daqui a 19 dias');
    expect(relativeDays('2026-07-25', NOW)).toBe('foi ontem');
    expect(relativeDays('2026-01-01', NOW)).toBe('já passou');
  });
});

describe('eventIsUnlocked', () => {
  it('libera o álbum no dia do rolê e depois', () => {
    expect(eventIsUnlocked('2026-07-27', NOW)).toBe(false);
    expect(eventIsUnlocked('2026-07-26', NOW)).toBe(true);
    expect(eventIsUnlocked('2026-07-25', NOW)).toBe(true);
  });
});

describe('relativeTime', () => {
  it('formata posts do mural', () => {
    const iso = (minsAgo: number) => new Date(NOW.getTime() - minsAgo * 60000).toISOString();
    expect(relativeTime(iso(0), NOW)).toBe('agora mesmo');
    expect(relativeTime(iso(12), NOW)).toBe('há 12 min');
    expect(relativeTime(iso(60 * 5), NOW)).toBe('há 5 h');
    expect(relativeTime(iso(60 * 24), NOW)).toBe('ontem');
    expect(relativeTime(iso(60 * 24 * 4), NOW)).toBe('há 4 dias');
  });
});
