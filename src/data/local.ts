import type {
  DataAdapter,
  EventRecord,
  Guest,
  GuestLink,
  NewEventInput,
  NotificationKind,
  Org,
  OutboxMessage,
  Promoter,
  RsvpInput,
} from '../types';
import { avatarColor, sameName, shortCode, uid } from '../lib/format';
import { downscaleImage } from '../lib/image';
import { deviceId } from './identity';
import { seedDb } from './seed';

const DB_KEY = 'galera.db.v2';

type StoredGuest = Omit<Guest, 'color'>;

export interface StoredEvent extends Omit<EventRecord, 'isHost' | 'guests'> {
  hostId: string;
  guests: StoredGuest[];
}

export interface StoredOrg extends Org {
  ownerId: string;
}

export interface Db {
  events: StoredEvent[];
  orgs: StoredOrg[];
  promoters: Promoter[];
  outbox: OutboxMessage[];
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
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Db>;
      return {
        events: parsed.events ?? [],
        orgs: parsed.orgs ?? [],
        promoters: parsed.promoters ?? [],
        outbox: parsed.outbox ?? [],
      };
    }
  } catch {
    /* JSON corrompido: recomeça do seed */
  }
  const fresh = seedDb(deviceId());
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

function mutate<T>(fn: (db: Db) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

function mutateEvent<T>(eventId: string, fn: (ev: StoredEvent, db: Db) => T): T {
  return mutate((db) => {
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) throw new Error('Rolê não encontrado');
    return fn(ev, db);
  });
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
    const ev: StoredEvent = {
      emoji: input.emoji,
      title: input.title,
      date: input.date,
      time: input.time,
      location: input.location,
      description: input.description,
      color: input.color,
      pix: input.pix,
      orgId: input.orgId ?? null,
      ticketPrice: input.ticketPrice ?? 0,
      capacity: input.capacity ?? null,
      id: uid(),
      createdAt: new Date().toISOString(),
      hostId: deviceId(),
      guests: [],
      mural: [],
      polls: [],
      photos: [],
      links: [],
    };
    mutate((db) => db.events.unshift(ev));
    return hydrate(ev, deviceId());
  }

  async rsvp(eventId: string, input: RsvpInput): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const existing = ev.guests.find((g) => sameName(g.name, input.name));
      if (existing) {
        existing.status = input.status;
        existing.name = input.name;
        if (input.phone !== undefined && input.phone !== null) existing.phone = input.phone;
        if (input.waOptIn !== undefined && input.waOptIn !== existing.waOptIn) {
          existing.waOptIn = input.waOptIn;
          existing.waOptInAt = input.waOptIn ? new Date().toISOString() : null;
        }
        if (input.linkCode && !existing.linkCode) existing.linkCode = input.linkCode;
        return;
      }
      ev.guests.push({
        id: uid(),
        name: input.name,
        status: input.status,
        phone: input.phone ?? null,
        waOptIn: !!input.waOptIn,
        waOptInAt: input.waOptIn ? new Date().toISOString() : null,
        linkCode: input.linkCode ?? null,
        checkedInAt: null,
        amountPaid: 0,
      });
    });
  }

  async addMuralPost(eventId: string, text: string): Promise<void> {
    mutateEvent(eventId, (ev) => {
      ev.mural.unshift({ id: uid(), text, createdAt: new Date().toISOString() });
    });
  }

  async createPoll(eventId: string, question: string, options: string[]): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const opts = options.map((text) => ({ id: uid(), text }));
      const votes: Record<string, string[]> = {};
      opts.forEach((o) => (votes[o.id] = []));
      ev.polls.unshift({ id: uid(), question, options: opts, votes, notified: false });
    });
  }

  async votePoll(eventId: string, pollId: string, optionId: string, voterName: string): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const poll = ev.polls.find((p) => p.id === pollId);
      if (!poll) return;
      Object.keys(poll.votes).forEach((k) => {
        poll.votes[k] = poll.votes[k].filter((n) => !sameName(n, voterName));
      });
      (poll.votes[optionId] ??= []).push(voterName);
    });
  }

  async markPollNotified(eventId: string, pollId: string): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const poll = ev.polls.find((p) => p.id === pollId);
      if (poll) poll.notified = true;
    });
  }

  async addPhotos(eventId: string, files: File[], uploader: string): Promise<void> {
    for (const file of files) {
      const { dataUrl } = await downscaleImage(file, 1080, 0.7);
      mutateEvent(eventId, (ev) => {
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

  /* ---------- B2B ---------- */

  async listOrgs(): Promise<Org[]> {
    const me = deviceId();
    return readDb()
      .orgs.filter((o) => o.ownerId === me)
      .map(({ ownerId: _ownerId, ...org }) => org);
  }

  async createOrg(name: string): Promise<Org> {
    const org: StoredOrg = { id: uid(), name, createdAt: new Date().toISOString(), ownerId: deviceId() };
    mutate((db) => db.orgs.push(org));
    const { ownerId: _ownerId, ...rest } = org;
    return rest;
  }

  async listOrgEvents(orgId: string): Promise<EventRecord[]> {
    const me = deviceId();
    return readDb()
      .events.filter((e) => e.orgId === orgId)
      .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
      .map((e) => hydrate(e, me));
  }

  async listPromoters(orgId: string): Promise<Promoter[]> {
    return readDb().promoters.filter((p) => p.orgId === orgId);
  }

  async createPromoter(
    orgId: string,
    name: string,
    phone: string | null,
    commissionPct: number,
  ): Promise<Promoter> {
    const promoter: Promoter = {
      id: uid(),
      orgId,
      name,
      phone,
      commissionPct,
      active: true,
      createdAt: new Date().toISOString(),
    };
    mutate((db) => db.promoters.push(promoter));
    return promoter;
  }

  async updatePromoter(
    promoterId: string,
    patch: Partial<Pick<Promoter, 'name' | 'phone' | 'commissionPct' | 'active'>>,
  ): Promise<void> {
    mutate((db) => {
      const p = db.promoters.find((x) => x.id === promoterId);
      if (p) Object.assign(p, patch);
    });
  }

  async createGuestLink(
    eventId: string,
    input: { label: string; promoterId: string | null; maxUses: number | null },
  ): Promise<GuestLink> {
    return mutateEvent(eventId, (ev) => {
      const link: GuestLink = {
        id: uid(),
        eventId,
        code: shortCode(),
        label: input.label,
        promoterId: input.promoterId,
        maxUses: input.maxUses,
        opens: 0,
        createdAt: new Date().toISOString(),
        active: true,
      };
      ev.links.push(link);
      return link;
    });
  }

  async registerLinkOpen(eventId: string, code: string): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const link = ev.links.find((l) => l.code === code);
      if (link) link.opens += 1;
    });
  }

  async checkIn(eventId: string, guestId: string, amountPaid: number): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const guest = ev.guests.find((g) => g.id === guestId);
      if (!guest) throw new Error('Convidado não encontrado');
      guest.checkedInAt = new Date().toISOString();
      guest.amountPaid = amountPaid;
    });
  }

  async undoCheckIn(eventId: string, guestId: string): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const guest = ev.guests.find((g) => g.id === guestId);
      if (!guest) return;
      guest.checkedInAt = null;
      guest.amountPaid = 0;
    });
  }

  /* ---------- mensageria ---------- */

  async listOutbox(eventId: string): Promise<OutboxMessage[]> {
    return readDb()
      .outbox.filter((m) => m.eventId === eventId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async queueMessages(
    eventId: string,
    messages: { toName: string; toPhone: string; kind: NotificationKind; text: string }[],
  ): Promise<void> {
    mutate((db) => {
      for (const m of messages) {
        db.outbox.push({
          id: uid(),
          eventId,
          toName: m.toName,
          toPhone: m.toPhone,
          kind: m.kind,
          text: m.text,
          status: 'pendente',
          createdAt: new Date().toISOString(),
          sentAt: null,
        });
      }
    });
  }

  async markMessageSent(messageId: string): Promise<void> {
    mutate((db) => {
      const m = db.outbox.find((x) => x.id === messageId);
      if (m) {
        m.status = 'enviado';
        m.sentAt = new Date().toISOString();
      }
    });
  }

  async clearOutbox(eventId: string): Promise<void> {
    mutate((db) => {
      db.outbox = db.outbox.filter((m) => m.eventId !== eventId);
    });
  }
}
