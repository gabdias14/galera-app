import { describe, expect, it } from 'vitest';
import { buildRecapData, recapFileName } from '../src/lib/recap';
import type { EventRecord } from '../src/types';

const NOW = new Date(2026, 6, 26);

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    emoji: '🍖',
    title: 'Churrasco do Gabriel',
    date: '2026-08-14',
    time: '13:00',
    location: 'Vila Madalena, SP',
    description: '',
    color: 'coral',
    pix: '',
    createdAt: '2026-07-01T12:00:00.000Z',
    isHost: true,
    guests: [
      { id: 'g1', name: 'Marina Costa', status: 'vou', color: '#fff' },
      { id: 'g2', name: 'Lucas Andrade', status: 'vou', color: '#fff' },
      { id: 'g3', name: 'João Pedro', status: 'talvez', color: '#fff' },
      { id: 'g4', name: 'Aline Rocha', status: 'nao', color: '#fff' },
    ],
    mural: [],
    polls: [],
    photos: [],
    ...overrides,
  };
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
    const guests = Array.from({ length: 20 }, (_, i) => ({
      id: `g${i}`,
      name: `Pessoa ${i}`,
      status: 'vou' as const,
      color: '#fff',
    }));
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
