import { describe, expect, it } from 'vitest';
import { buildCountdownData, buildRecapData, buildSeasonRecapData, recapFileName } from '../src/lib/recap';
import { makeEvent as baseEvent, makeGuest } from './fixtures';
import type { EventRecord } from '../src/types';

const NOW = new Date(2026, 6, 26);

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return baseEvent({
    guests: [
      makeGuest('Marina Costa', 'vou'),
      makeGuest('Lucas Andrade', 'vou'),
      makeGuest('João Pedro', 'talvez'),
      makeGuest('Aline Rocha', 'nao'),
    ],
    ...overrides,
  });
}

describe('buildRecapData', () => {
  it('conta confirmados e talvez separadamente', () => {
    const data = buildRecapData(makeEvent(), NOW);
    expect(data.confirmedCount).toBe(2);
    expect(data.maybeCount).toBe(1);
    expect(data.guestNames).toEqual(['Marina Costa', 'Lucas Andrade']);
  });

  it('muda a headline depois que o rolê passa', () => {
    expect(buildRecapData(makeEvent(), NOW).isPast).toBe(false);
    expect(buildRecapData(makeEvent(), NOW).headline).toBe('tá marcado!');
    const past = buildRecapData(makeEvent({ date: '2026-07-01' }), NOW);
    expect(past.isPast).toBe(true);
    expect(past.headline).toBe('que rolê!');
  });

  it('escolhe a opção mais votada da primeira enquete com votos', () => {
    const data = buildRecapData(
      makeEvent({
        polls: [
          {
            id: 'p0',
            question: 'Enquete sem voto',
            options: [{ id: 'x', text: 'Nada' }],
            votes: { x: [] },
            notified: false,
          },
          {
            id: 'p1',
            question: 'Qual carne?',
            options: [
              { id: 'a', text: 'Picanha' },
              { id: 'b', text: 'Costela' },
            ],
            votes: { a: ['Marina Costa', 'Lucas Andrade', 'Ana'], b: ['Bia'] },
            notified: false,
          },
        ],
      }),
      NOW,
    );
    expect(data.topPoll).toEqual({ question: 'Qual carne?', optionText: 'Picanha', pct: 75, votes: 3 });
  });

  it('ignora enquete sem nenhum voto', () => {
    const data = buildRecapData(
      makeEvent({
        polls: [
          {
            id: 'p0',
            question: 'Ninguém votou',
            options: [{ id: 'x', text: 'Nada' }],
            votes: { x: [] },
            notified: false,
          },
        ],
      }),
      NOW,
    );
    expect(data.topPoll).toBeNull();
  });

  it('limita o mosaico a 12 avatares e 6 fotos, sem placeholders', () => {
    const guests = Array.from({ length: 20 }, (_, i) => makeGuest(`Pessoa ${i}`, 'vou'));
    const photos = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`,
      url: i < 8 ? `https://cdn/${i}.jpg` : null,
      caption: '',
      uploader: '',
    }));
    const data = buildRecapData(makeEvent({ guests, photos }), NOW);
    expect(data.confirmedCount).toBe(20);
    expect(data.guestNames).toHaveLength(12);
    expect(data.photoUrls).toHaveLength(6);
    expect(data.photoUrls.every((u) => u.startsWith('https://cdn/'))).toBe(true);
  });
});

describe('recapFileName', () => {
  it('gera um nome de arquivo seguro', () => {
    expect(recapFileName('Churrasco do Gabriel 🍖')).toBe('recap-churrasco-do-gabriel.png');
    expect(recapFileName('Pré-Carnaval na Cobertura')).toBe('recap-pre-carnaval-na-cobertura.png');
    expect(recapFileName('🎉')).toBe('recap-role.png');
  });
});

describe('buildCountdownData', () => {
  it('conta dias corridos até o rolê e não deixa ir negativo', () => {
    const data = buildCountdownData(makeEvent({ date: '2026-08-10' }), NOW);
    expect(data.daysLeft).toBe(15);
    expect(buildCountdownData(makeEvent({ date: '2026-07-01' }), NOW).daysLeft).toBe(0);
  });

  it('separa confirmados de talvez e leva a lotação', () => {
    const data = buildCountdownData(
      makeEvent({
        capacity: 100,
        guests: [makeGuest('A', 'vou'), makeGuest('B', 'talvez')],
      }),
      NOW,
    );
    expect(data.confirmedCount).toBe(1);
    expect(data.maybeCount).toBe(1);
    expect(data.capacity).toBe(100);
  });
});

describe('buildSeasonRecapData', () => {
  it('soma só edições passadas e ignora a futura', () => {
    const data = buildSeasonRecapData(
      'Aurora Produções',
      [
        makeEvent({
          id: 'e1',
          date: '2026-01-10',
          guests: [makeGuest('Ana', 'vou', { checkedInAt: '2026-01-10T23:00:00Z', amountPaid: 100 })],
        }),
        makeEvent({
          id: 'e2',
          date: '2026-06-10',
          guests: [makeGuest('Ana', 'vou', { checkedInAt: '2026-06-10T23:00:00Z', amountPaid: 80 })],
        }),
        makeEvent({ id: 'e3', date: '2026-12-31', guests: [] }), // futura, fora da temporada
      ],
      NOW,
    );
    expect(data.editionsCount).toBe(2);
    expect(data.totalAttendance).toBe(2);
    expect(data.totalRevenue).toBe(180);
    expect(data.topAttendees).toEqual(['Ana']);
  });

  it('não quebra sem histórico', () => {
    const data = buildSeasonRecapData('Nova Produtora', [], NOW);
    expect(data).toMatchObject({ editionsCount: 0, totalAttendance: 0, totalRevenue: 0, topAttendees: [] });
  });
});
