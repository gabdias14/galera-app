import { beforeEach, describe, expect, it } from 'vitest';
import { enqueueCheckIn, queueForEvent, removeFromQueue } from '../src/data/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enfileira e lista só os itens do rolê certo', () => {
    enqueueCheckIn({ eventId: 'e1', guestId: 'g1', guestName: 'Ana', amountPaid: 50, action: 'checkin' });
    enqueueCheckIn({ eventId: 'e2', guestId: 'g2', guestName: 'Bia', amountPaid: 0, action: 'checkin' });
    enqueueCheckIn({ eventId: 'e1', guestId: 'g3', guestName: 'Caio', amountPaid: 70, action: 'undo' });

    const q = queueForEvent('e1');
    expect(q).toHaveLength(2);
    expect(q.map((i) => i.guestName)).toEqual(['Ana', 'Caio']);
    expect(queueForEvent('e2')).toHaveLength(1);
  });

  it('remove só o item indicado, mantendo o resto da fila', () => {
    const a = enqueueCheckIn({ eventId: 'e1', guestId: 'g1', guestName: 'Ana', amountPaid: 50, action: 'checkin' });
    enqueueCheckIn({ eventId: 'e1', guestId: 'g2', guestName: 'Bia', amountPaid: 0, action: 'checkin' });

    removeFromQueue(a.id);
    const q = queueForEvent('e1');
    expect(q).toHaveLength(1);
    expect(q[0].guestName).toBe('Bia');
  });

  it('não quebra com localStorage vazio', () => {
    expect(queueForEvent('inexistente')).toEqual([]);
  });
});
