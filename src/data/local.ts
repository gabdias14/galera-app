import type {
  DataAdapter,
  EventRecord,
  Guest,
  NewEventInput,
  RsvpStatus,
} from '../types';
import { avatarColor, sameName, uid } from '../lib/format';
import { downscaleImage } from '../lib/image';
import { deviceId } from './identity';
import { seedEvents } from './seed';

const DB_KEY = 'galera.db.v1';

type StoredGuest = Omit<Guest, 'color'>;
export interface StoredEvent extends Omit<EventRecord, 'isHost' | 'guests'> {
  hostId: string;
  guests: StoredGuest[];
}
interface Db {
  events: StoredEvent[];
}

export class QuotaError extends Error {
  constructor() {
    super('Acabou o espaço de armazenamento local. Apague algumas fotos ou conecte o Supabase.');
    this.name = 'QuotaError';
  }
}

function readDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* JSON corrompido: recomeça do seed */
  }
  const fresh: Db = { events: seedEvents(deviceId()) };
  writeDb(fresh);
  return fresh;
}

function writeDb(db: Db): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    if (err instanceof DOMException && /quota/i.test(err.name)) throw new QuotaError();
    throw err;
  }
}

function hydrate(ev: StoredEvent, myId: string): EventRecord {
  const { hostId, ...rest } = ev;
  return {
    ...rest,
    isHost: hostId === myId,
    guests: ev.guests.map((g) => ({ ...g, color: avatarColor(g.name) })),
  };
}

function mutate(eventId: string, fn: (ev: StoredEvent) => void): void {
  const db = readDb();
  const ev = db.events.find((e) => e.id === eventId);
  if (!ev) throw new Error('Rolê não encontrado');
  fn(ev);
  writeDb(db);
}

/** Backend de desenvolvimento: tudo no localStorage do aparelho. */
export class LocalAdapter implements DataAdapter {
  readonly kind = 'local' as const;

  async init(): Promise<void> {
    readDb();
  }

  async listEvents(): Promise<EventRecord[]> {
    const me = deviceId();
    return readDb()
      .events.slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((e) => hydrate(e, me));
  }

  async getEvent(id: string): Promise<EventRecord | null> {
    const found = readDb().events.find((e) => e.id === id);
    return found ? hydrate(found, deviceId()) : null;
  }

  async createEvent(input: NewEventInput): Promise<EventRecord> {
    const db = readDb();
    const ev: StoredEvent = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
      hostId: deviceId(),
      guests: [],
      mural: [],
      polls: [],
      photos: [],
    };
    db.events.unshift(ev);
    writeDb(db);
    return hydrate(ev, deviceId());
  }

  async rsvp(eventId: string, name: string, status: RsvpStatus): Promise<void> {
    mutate(eventId, (ev) => {
      const existing = ev.guests.find((g) => sameName(g.name, name));
      if (existing) {
        existing.status = status;
        existing.name = name;
      } else {
        ev.guests.push({ id: uid(), name, status });
      }
    });
  }

  async addMuralPost(eventId: string, text: string): Promise<void> {
    mutate(eventId, (ev) => {
      ev.mural.unshift({ id: uid(), text, createdAt: new Date().toISOString() });
    });
  }

  async createPoll(eventId: string, question: string, options: string[]): Promise<void> {
    mutate(eventId, (ev) => {
      const opts = options.map((text) => ({ id: uid(), text }));
      const votes: Record<string, string[]> = {};
      opts.forEach((o) => (votes[o.id] = []));
      ev.polls.unshift({ id: uid(), question, options: opts, votes, notified: false });
    });
  }

  async votePoll(eventId: string, pollId: string, optionId: string, voterName: string): Promise<void> {
    mutate(eventId, (ev) => {
      const poll = ev.polls.find((p) => p.id === pollId);
      if (!poll) return;
      Object.keys(poll.votes).forEach((k) => {
        poll.votes[k] = poll.votes[k].filter((n) => !sameName(n, voterName));
      });
      (poll.votes[optionId] ??= []).push(voterName);
    });
  }

  async markPollNotified(eventId: string, pollId: string): Promise<void> {
    mutate(eventId, (ev) => {
      const poll = ev.polls.find((p) => p.id === pollId);
      if (poll) poll.notified = true;
    });
  }

  async addPhotos(eventId: string, files: File[], uploader: string): Promise<void> {
    for (const file of files) {
      const { dataUrl } = await downscaleImage(file, 1080, 0.7);
      mutate(eventId, (ev) => {
        ev.photos.push({ id: uid(), url: dataUrl, caption: '', uploader });
      });
    }
  }

  subscribe(_eventId: string, onChange: () => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === DB_KEY) onChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
