import { describe, expect, it } from 'vitest';
import { buildICS, escapeICS, googleCalUrl, icsDateEnd, icsDateStart } from '../src/lib/calendar';
import { makeEvent } from './fixtures';

const ev = makeEvent({
  id: 'abc',
  title: 'Churrasco do Gabriel',
  description: 'Traz a fruta da caipirinha;\nou não',
});

describe('ICS', () => {
  it('usa horário local no formato do calendário', () => {
    expect(icsDateStart(ev)).toBe('20260814T130000');
  });

  it('assume 3 horas de rolê', () => {
    expect(icsDateEnd(ev)).toBe('20260814T160000');
  });

  it('vira o dia quando o rolê começa tarde', () => {
    expect(icsDateEnd({ date: '2026-08-14', time: '23:00' })).toBe('20260815T020000');
  });

  it('escapa os caracteres reservados do formato', () => {
    expect(escapeICS('a;b,c\nd')).toBe('a\\;b\\,c\\nd');
  });

  it('monta um VCALENDAR completo com CRLF', () => {
    const ics = buildICS(ev);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('SUMMARY:Churrasco do Gabriel');
    expect(ics).toContain('DESCRIPTION:Traz a fruta da caipirinha\\;\\nou não');
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
  });
});

describe('googleCalUrl', () => {
  it('leva título, datas e local codificados', () => {
    const url = googleCalUrl(ev);
    expect(url).toContain('dates=20260814T130000/20260814T160000');
    expect(url).toContain(`text=${encodeURIComponent(ev.title)}`);
    expect(url).toContain(`location=${encodeURIComponent(ev.location)}`);
  });
});
