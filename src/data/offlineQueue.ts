import { uid } from '../lib/format';

/**
 * Fila de check-ins feitos sem rede. Só existe pro backend Supabase — o
 * modo local já é "offline" por definição, é puro localStorage.
 *
 * Escopo deliberado: só check-in/desfazer, que é a ação que não pode parar
 * na porta da festa. RSVP, enquete etc. esperam voltar a rede normalmente.
 */
const KEY = 'galera.offline-checkins.v1';

export interface QueuedCheckIn {
  id: string;
  eventId: string;
  guestId: string;
  guestName: string;
  amountPaid: number;
  action: 'checkin' | 'undo';
  createdAt: string;
}

function read(): QueuedCheckIn[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedCheckIn[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedCheckIn[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* se nem a fila couber, o pior caso é perder o registro — não trava a portaria */
  }
}

export function enqueueCheckIn(item: Omit<QueuedCheckIn, 'id' | 'createdAt'>): QueuedCheckIn {
  const entry: QueuedCheckIn = { ...item, id: uid(), createdAt: new Date().toISOString() };
  write([...read(), entry]);
  return entry;
}

export function queueForEvent(eventId: string): QueuedCheckIn[] {
  return read()
    .filter((i) => i.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function removeFromQueue(id: string): void {
  write(read().filter((i) => i.id !== id));
}
