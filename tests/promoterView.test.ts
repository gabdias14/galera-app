import { beforeEach, describe, expect, it } from 'vitest';
import { LocalAdapter } from '../src/data/local';

describe('LocalAdapter.getPromoterView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna null pra token desconhecido', async () => {
    const adapter = new LocalAdapter();
    expect(await adapter.getPromoterView('token-que-nao-existe')).toBeNull();
  });

  it('agrega links, confirmados, presenças e receita do promoter pelo publicToken', async () => {
    const adapter = new LocalAdapter();
    const org = await adapter.createOrg('Aurora Produções');
    const promoter = await adapter.createPromoter(org.id, 'Rafa Menezes', null, 10);
    const ev = await adapter.createEvent({
      emoji: '🎉',
      title: 'Festa da Aurora',
      date: '2026-08-01',
      time: '22:00',
      location: 'Aurora Club',
      description: '',
      color: 'coral',
      pix: '',
      orgId: org.id,
      ticketPrice: 50,
    });
    const link = await adapter.createGuestLink(ev.id, {
      label: 'Rafa',
      promoterId: promoter.id,
      maxUses: null,
    });
    await adapter.registerLinkOpen(ev.id, link.code);
    await adapter.registerLinkOpen(ev.id, link.code);
    const { guestId } = await adapter.rsvp(ev.id, { name: 'Convidada X', status: 'vou', linkCode: link.code });
    await adapter.checkIn(ev.id, guestId, 50);

    const view = await adapter.getPromoterView(promoter.publicToken);
    expect(view).not.toBeNull();
    expect(view).toMatchObject({
      name: 'Rafa Menezes',
      commissionPct: 10,
      active: true,
      links: 1,
      opens: 2,
      confirmed: 1,
      attended: 1,
      revenue: 50,
      commission: 5,
    });
  });
});
