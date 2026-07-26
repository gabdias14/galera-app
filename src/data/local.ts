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
  PromoterView,
  RsvpInput,
  RsvpResult,
} from '../types';
import { NameTakenError } from '../types';
import { avatarColor, sameName, shortCode, uid } from '../lib/format';
import { downscaleImage } from '../lib/image';
import { promoterStats } from '../lib/audience';
import { deviceId } from './identity';
import { seedDb } from './seed';

const DB_KEY = 'galera.db.v2';

type StoredGuest = Omit<Guest, 'color'> & { token?: string | null };

export interface StoredEvent extends Omit<EventRecord, 'isHost' | 'guests'> {
  hostId: string;
  guests: StoredGuest[];
}

export interface StoredOrg extends Org {
  ownerId: string;
}

interface StoredProductEvent {
  id: string;
  name: string;
  props: Record<string, unknown>;
  eventId: string | null;
  createdAt: string;
}

export interface Db {
  events: StoredEvent[];
  orgs: StoredOrg[];
  promoters: Promoter[];
  outbox: OutboxMessage[];
  analytics: StoredProductEvent[];
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
        analytics: parsed.analytics ?? [],
      };
    }
  } catch {
    /* JSON corrompido: recomeça do seed */
  }
  const fresh = seedDb(deviceId());
  writeDb(fresh);
  return fresh;
}

/** Apaga o banco local — a próxima leitura reseeda do zero (ver readDb). Usado pelo "reiniciar demo". */
export function resetLocalDb(): void {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* modo privado / storage indisponível: nada a limpar */
  }
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
    guests: ev.guests.map(({ token: _token, ...g }) => ({ ...g, color: avatarColor(g.name) })),
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

  async rsvp(eventId: string, input: RsvpInput): Promise<RsvpResult> {
    return mutateEvent(eventId, (ev) => {
      const existing = ev.guests.find((g) => sameName(g.name, input.name));
      if (existing) {
        // Nome já usado por outra pessoa: só passa quem tem o token dele.
        // É o mesmo mecanismo que impede sabotagem e que resolve homônimo.
        if (existing.token && existing.token !== input.token) throw new NameTakenError(input.name);
        const token = existing.token ?? input.token ?? uid();
        existing.token = token;
        existing.status = input.status;
        existing.name = input.name;
        if (input.phone !== undefined && input.phone !== null) existing.phone = input.phone;
        if (input.waOptIn !== undefined && input.waOptIn !== existing.waOptIn) {
          existing.waOptIn = input.waOptIn;
          existing.waOptInAt = input.waOptIn ? new Date().toISOString() : null;
        }
        if (input.linkCode && !existing.linkCode) existing.linkCode = input.linkCode;
        if (input.docLast4 !== undefined && input.docLast4 !== null) existing.docLast4 = input.docLast4;
        return { guestId: existing.id, token };
      }
      const guest = {
        id: uid(),
        name: input.name,
        status: input.status,
        phone: input.phone ?? null,
        waOptIn: !!input.waOptIn,
        waOptInAt: input.waOptIn ? new Date().toISOString() : null,
        linkCode: input.linkCode ?? null,
        checkedInAt: null,
        amountPaid: 0,
        docLast4: input.docLast4 ?? null,
        token: input.token ?? uid(),
      };
      ev.guests.push(guest);
      return { guestId: guest.id, token: guest.token as string };
    });
  }

  async updateEvent(eventId: string, patch: Partial<NewEventInput>): Promise<void> {
    mutateEvent(eventId, (ev) => {
      Object.assign(ev, patch);
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    mutate((db) => {
      db.events = db.events.filter((e) => e.id !== eventId);
      db.outbox = db.outbox.filter((m) => m.eventId !== eventId);
    });
  }

  async setGuestConsent(eventId: string, guestId: string, waOptIn: boolean): Promise<void> {
    mutateEvent(eventId, (ev) => {
      const guest = ev.guests.find((g) => g.id === guestId);
      if (!guest) return;
      guest.waOptIn = waOptIn;
      guest.waOptInAt = waOptIn ? new Date().toISOString() : null;
      if (!waOptIn) guest.phone = null;
    });
  }

  async deleteGuest(eventId: string, guestId: string): Promise<void> {
    mutate((db) => {
      const ev = db.events.find((e) => e.id === eventId);
      if (!ev) return;
      const guest = ev.guests.find((g) => g.id === guestId);
      ev.guests = ev.guests.filter((g) => g.id !== guestId);
      if (guest) {
        // some também da fila de mensagens e dos votos
        db.outbox = db.outbox.filter((m) => !(m.eventId === eventId && m.toName === guest.name));
        ev.polls.forEach((poll) => {
          Object.keys(poll.votes).forEach((k) => {
            poll.votes[k] = poll.votes[k].filter((n) => !sameName(n, guest.name));
          });
        });
      }
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
      publicToken: uid(),
    };
    mutate((db) => db.promoters.push(promoter));
    return promoter;
  }

  async getPromoterView(token: string): Promise<PromoterView | null> {
    const db = readDb();
    const promoter = db.promoters.find((p) => p.publicToken === token);
    if (!promoter) return null;
    const me = deviceId();
    const events = db.events.filter((e) => e.orgId === promoter.orgId).map((e) => hydrate(e, me));
    const [stats] = promoterStats(events, [promoter]);
    return {
      name: promoter.name,
      commissionPct: promoter.commissionPct,
      active: promoter.active,
      links: stats.links,
      opens: stats.opens,
      confirmed: stats.confirmed,
      attended: stats.attended,
      revenue: stats.revenue,
      commission: stats.commission,
      conversion: stats.conversion,
    };
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

  /* ---------- instrumentação ---------- */

  async trackEvent(name: string, props: Record<string, unknown>, eventId: string | null): Promise<void> {
    mutate((db) => {
      db.analytics.push({ id: uid(), name, props, eventId, createdAt: new Date().toISOString() });
      // cap simples: modo local não precisa reter histórico ilimitado
      if (db.analytics.length > 2000) db.analytics = db.analytics.slice(-2000);
    });
  }

  async getFunnelStats(): Promise<Record<string, number>> {
    const me = deviceId();
    const myEventIds = new Set(readDb().events.filter((e) => e.hostId === me).map((e) => e.id));
    const stats: Record<string, number> = {};
    for (const row of readDb().analytics) {
      if (row.eventId && !myEventIds.has(row.eventId)) continue;
      stats[row.name] = (stats[row.name] ?? 0) + 1;
    }
    return stats;
  }
}
