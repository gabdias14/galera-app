import { describe, expect, it } from 'vitest';
import {
  buildContacts,
  doorStats,
  eventRevenue,
  filterAudience,
  projectAudience,
  promoterStats,
  scoreContacts,
  WALK_IN_CODE,
} from '../src/lib/audience';
import type { GuestLink, Promoter } from '../src/types';
import { makeEvent, makeGuest } from './fixtures';

const NOW = new Date(2026, 6, 26); // 26/07/2026

function link(code: string, label: string, promoterId: string | null): GuestLink {
  return {
    id: `l-${code}`,
    eventId: 'x',
    code,
    label,
    promoterId,
    maxUses: null,
    opens: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  };
}

const promoters: Promoter[] = [
  { id: 'p1', orgId: 'o1', name: 'Rafa', phone: null, commissionPct: 10, active: true, createdAt: '', publicToken: 'tok-rafa' },
  { id: 'p2', orgId: 'o1', name: 'Bibi', phone: null, commissionPct: 20, active: true, createdAt: '', publicToken: 'tok-bibi' },
];

/** Três edições passadas + uma futura, com perfis bem distintos de público. */
function history() {
  const e1 = makeEvent({
    id: 'e1',
    date: '2026-01-10',
    ticketPrice: 50,
    orgId: 'o1',
    links: [link('RAFA1', 'Rafa', 'p1')],
    guests: [
      makeGuest('Ana Vip', 'vou', { checkedInAt: '2026-01-10T23:00:00Z', amountPaid: 200, phone: '5511987654321', waOptIn: true, linkCode: 'RAFA1' }),
      makeGuest('Beto Fiel', 'vou', { checkedInAt: '2026-01-10T23:30:00Z', amountPaid: 60, phone: '5511987654322', waOptIn: true }),
      makeGuest('Caio Furador', 'vou'),
      makeGuest('Dora Dormente', 'vou', { checkedInAt: '2026-01-10T23:40:00Z', amountPaid: 70, phone: '5511987654323', waOptIn: true }),
    ],
  });

  const e2 = makeEvent({
    id: 'e2',
    date: '2026-05-10',
    ticketPrice: 60,
    orgId: 'o1',
    links: [link('BIBI1', 'Bibi', 'p2')],
    guests: [
      makeGuest('Ana Vip', 'vou', { checkedInAt: '2026-05-10T23:00:00Z', amountPaid: 180, phone: '5511987654321', waOptIn: true, linkCode: 'BIBI1' }),
      makeGuest('Beto Fiel', 'vou', { checkedInAt: '2026-05-10T23:10:00Z', amountPaid: 60 }),
      makeGuest('Caio Furador', 'vou'),
    ],
  });

  const e3 = makeEvent({
    id: 'e3',
    date: '2026-07-10',
    ticketPrice: 70,
    orgId: 'o1',
    links: [link('BIBI2', 'Bibi', 'p2')],
    guests: [
      makeGuest('Ana Vip', 'vou', { checkedInAt: '2026-07-10T23:00:00Z', amountPaid: 220, phone: '5511987654321', waOptIn: true }),
      makeGuest('Beto Fiel', 'vou', { phone: '5511987654322', waOptIn: true }),
      makeGuest('Caio Furador', 'vou', { phone: '5511987654324', waOptIn: false }),
      makeGuest('Novo Promissor', 'vou', { checkedInAt: '2026-07-10T23:20:00Z', amountPaid: 70, linkCode: 'BIBI2' }),
    ],
  });

  const futuro = makeEvent({ id: 'e4', date: '2026-08-20', ticketPrice: 90, orgId: 'o1' });
  return [e1, e2, e3, futuro];
}

describe('buildContacts', () => {
  it('junta a mesma pessoa entre rolês e soma o que ela gastou', () => {
    const contacts = buildContacts(history(), NOW);
    const ana = contacts.find((c) => c.name === 'Ana Vip')!;
    expect(ana.invited).toBe(3);
    expect(ana.confirmed).toBe(3);
    expect(ana.attended).toBe(3);
    expect(ana.revenue).toBe(600);
    expect(ana.noShows).toBe(0);
    expect(ana.phone).toBe('5511987654321');
    expect(ana.waOptIn).toBe(true);
    expect(ana.lastSeen).toBe('2026-07-10');
    expect(ana.firstSeen).toBe('2026-01-10');
  });

  it('conta furada só em rolê que já aconteceu', () => {
    const caio = buildContacts(history(), NOW).find((c) => c.name === 'Caio Furador')!;
    expect(caio.confirmed).toBe(3);
    expect(caio.attended).toBe(0);
    expect(caio.noShows).toBe(3);
    expect(caio.revenue).toBe(0);
  });

  it('credita indicação a quem é dono do link', () => {
    const contacts = buildContacts(
      [
        makeEvent({
          date: '2026-07-10',
          links: [link('ANA1', 'Ana Vip', null)],
          guests: [
            makeGuest('Ana Vip', 'vou', { checkedInAt: '2026-07-10T23:00:00Z' }),
            makeGuest('Amigo Um', 'vou', { linkCode: 'ANA1' }),
            makeGuest('Amigo Dois', 'vou', { linkCode: 'ANA1' }),
          ],
        }),
      ],
      NOW,
    );
    expect(contacts.find((c) => c.name === 'Ana Vip')!.referrals).toBe(2);
    expect(contacts.find((c) => c.name === 'Amigo Um')!.referrals).toBe(0);
  });
});

describe('scoreContacts', () => {
  it('põe quem gasta e aparece no topo', () => {
    const scored = scoreContacts(buildContacts(history(), NOW), NOW);
    expect(scored[0].name).toBe('Ana Vip');
    expect(scored[0].tier).toBe('vip');
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });

  it('marca como "em risco" quem confirma e fura', () => {
    const scored = scoreContacts(buildContacts(history(), NOW), NOW);
    expect(scored.find((c) => c.name === 'Caio Furador')!.tier).toBe('risco');
  });

  it('marca como dormente quem sumiu há mais de 6 meses', () => {
    const scored = scoreContacts(buildContacts(history(), NOW), NOW);
    expect(scored.find((c) => c.name === 'Dora Dormente')!.tier).toBe('dormente');
  });

  it('explica o motivo em português', () => {
    const ana = scoreContacts(buildContacts(history(), NOW), NOW)[0];
    expect(ana.reasons.join(' ')).toContain('3 presenças');
    expect(ana.reasons.join(' ')).toContain('100%');
  });

  it('mantém o score entre 0 e 100', () => {
    const scored = scoreContacts(buildContacts(history(), NOW), NOW);
    for (const c of scored) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('filterAudience', () => {
  const scored = scoreContacts(buildContacts(history(), NOW), NOW);

  it('só devolve quem autorizou WhatsApp quando pedido', () => {
    const list = filterAudience(scored, { onlyOptIn: true });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.waOptIn && c.phone)).toBe(true);
    expect(list.some((c) => c.name === 'Caio Furador')).toBe(false);
  });

  it('filtra por tier e por busca', () => {
    expect(filterAudience(scored, { tiers: ['vip'] }).every((c) => c.tier === 'vip')).toBe(true);
    expect(filterAudience(scored, { search: 'ana' }).map((c) => c.name)).toEqual(['Ana Vip']);
  });

  it('respeita o tamanho da lista', () => {
    expect(filterAudience(scored, { size: 2 })).toHaveLength(2);
  });
});

describe('projectAudience', () => {
  it('projeta menos presenças do que convites e usa o histórico de gasto', () => {
    const scored = scoreContacts(buildContacts(history(), NOW), NOW);
    const selected = filterAudience(scored, { onlyOptIn: true });
    const projection = projectAudience(selected, 90);
    expect(projection.people).toBe(selected.length);
    expect(projection.expectedAttendance).toBeLessThanOrEqual(projection.people);
    expect(projection.expectedRevenue).toBeGreaterThan(0);
    expect(projection.reachableByWhatsApp).toBe(selected.length);
  });

  it('não estoura com base vazia', () => {
    expect(projectAudience([], 90)).toEqual({
      people: 0,
      expectedAttendance: 0,
      expectedRevenue: 0,
      reachableByWhatsApp: 0,
    });
  });
});

describe('promoterStats', () => {
  it('atribui confirmação, presença e comissão pelo link', () => {
    const stats = promoterStats(history(), promoters);
    const bibi = stats.find((s) => s.promoter.name === 'Bibi')!;
    const rafa = stats.find((s) => s.promoter.name === 'Rafa')!;

    expect(rafa.confirmed).toBe(1);
    expect(rafa.attended).toBe(1);
    expect(rafa.revenue).toBe(200);
    expect(rafa.commission).toBe(20);

    expect(bibi.links).toBe(2);
    expect(bibi.confirmed).toBe(2);
    expect(bibi.revenue).toBe(250);
    expect(bibi.commission).toBe(50);
    expect(bibi.conversion).toBeCloseTo(2 / 20);
  });

  it('ordena por receita', () => {
    const stats = promoterStats(history(), promoters);
    expect(stats[0].promoter.name).toBe('Bibi');
  });
});

describe('doorStats', () => {
  it('conta quem está na casa, quem falta e o caixa', () => {
    const ev = makeEvent({
      capacity: 100,
      guests: [
        makeGuest('A', 'vou', { checkedInAt: '2026-07-10T23:00:00Z', amountPaid: 50 }),
        makeGuest('B', 'vou'),
        makeGuest('C', 'talvez', { checkedInAt: '2026-07-10T23:10:00Z', amountPaid: 70 }),
        makeGuest('D', 'nao'),
        // cadastrada na própria porta: confirma e entra no mesmo gesto
        makeGuest('E', 'vou', { checkedInAt: '2026-07-10T23:20:00Z', amountPaid: 90, linkCode: WALK_IN_CODE }),
      ],
    });
    expect(doorStats(ev)).toEqual({
      confirmed: 3,
      present: 3,
      maybe: 1,
      walkIns: 2,
      revenue: 210,
      capacity: 100,
    });
    expect(eventRevenue(ev)).toBe(210);
  });
});
