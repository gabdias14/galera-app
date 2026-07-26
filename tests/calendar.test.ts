import { describe, expect, it } from 'vitest';
import { buildICS, escapeICS, googleCalUrl, icsDateEnd, icsDateStart } from '../src/lib/calendar';
import type { EventRecord } from '../src/types';

const ev: EventRecord = {
  id: 'abc',
  emoji: '🍖',
  title: 'Churrasco do Gabriel',
  date: '2026-08-14',
  time: '13:00',
  location: 'Vila Madalena, SP',
  description: 'Traz a fruta da caipirinha;\nou não',
  color: 'coral',
  pix: '',
  createdAt: '2026-07-01T12:00:00.000Z',
  isHost: true,
  guests: [],
  mural: [],
  polls: [],
  photos: [],
};

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
