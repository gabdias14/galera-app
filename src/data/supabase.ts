import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DataAdapter,
  EventRecord,
  GuestLink,
  NewEventInput,
  NotificationKind,
  Org,
  OutboxMessage,
  Photo,
  Poll,
  Promoter,
  RsvpInput,
  RsvpResult,
  RsvpStatus,
  ThemeColor,
} from '../types';
import { NameTakenError } from '../types';
import { avatarColor, uid } from '../lib/format';
import { downscaleImage } from '../lib/image';
import { addKnownEvent, knownEventIds } from './known';
import { guestTokenFor } from './identity';

const PHOTO_BUCKET = 'event-photos';

/** Linhas cruas do Postgres (snake_case) antes de virarem o modelo de domínio. */
interface EventRow {
  id: string;
  host_id: string | null;
  emoji: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string | null;
  color: ThemeColor;
  pix: string | null;
  created_at: string;
  org_id: string | null;
  ticket_price: number | string | null;
  capacity: number | null;
  guests: { id: string; name: string; status: RsvpStatus; link_code: string | null }[];
  mural_posts: { id: string; text: string; created_at: string }[];
  polls: {
    id: string;
    question: string;
    notified: boolean;
    poll_options: { id: string; text: string; position: number }[];
    poll_votes: { option_id: string; voter_name: string }[];
  }[];
  photos: { id: string; url: string | null; caption: string | null; uploader: string | null }[];
  /** Só vem preenchido pro anfitrião — o RLS filtra pros demais. */
  guest_links: {
    id: string;
    event_id: string;
    promoter_id: string | null;
    code: string;
    label: string;
    max_uses: number | null;
    opens: number;
    active: boolean;
    created_at: string;
  }[];
  guest_contacts: {
    guest_id: string;
    phone: string | null;
    wa_opt_in: boolean;
    wa_opt_in_at: string | null;
  }[];
  checkins: { guest_id: string; checked_in_at: string; amount_paid: number | string }[];
}

const EVENT_SELECT = `
  id, host_id, emoji, title, date, time, location, description, color, pix, created_at,
  org_id, ticket_price, capacity,
  guests ( id, name, status, link_code ),
  mural_posts ( id, text, created_at ),
  polls ( id, question, notified, poll_options ( id, text, position ), poll_votes ( option_id, voter_name ) ),
  photos ( id, url, caption, uploader ),
  guest_links ( id, event_id, promoter_id, code, label, max_uses, opens, active, created_at ),
  guest_contacts ( guest_id, phone, wa_opt_in, wa_opt_in_at ),
  checkins ( guest_id, checked_in_at, amount_paid )
`;

const REALTIME_TABLES = [
  'events',
  'guests',
  'mural_posts',
  'polls',
  'poll_options',
  'poll_votes',
  'photos',
  'guest_links',
  'checkins',
];

function num(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toPoll(row: EventRow['polls'][number]): Poll {
  const options = [...row.poll_options].sort((a, b) => a.position - b.position);
  const votes: Record<string, string[]> = {};
  options.forEach((o) => (votes[o.id] = []));
  row.poll_votes.forEach((v) => {
    (votes[v.option_id] ??= []).push(v.voter_name);
  });
  return {
    id: row.id,
    question: row.question,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    votes,
    notified: row.notified,
  };
}

function toPhoto(row: EventRow['photos'][number]): Photo {
  return {
    id: row.id,
    url: row.url,
    caption: row.caption ?? '',
    uploader: row.uploader ?? '',
  };
}

function toLink(row: EventRow['guest_links'][number]): GuestLink {
  return {
    id: row.id,
    eventId: row.event_id,
    code: row.code,
    label: row.label,
    promoterId: row.promoter_id,
    maxUses: row.max_uses,
    opens: row.opens,
    createdAt: row.created_at,
    active: row.active,
  };
}

interface PromoterRow {
  id: string;
  org_id: string;
  name: string;
  phone: string | null;
  commission_pct: number | string;
  active: boolean;
  created_at: string;
}

function toPromoter(row: PromoterRow): Promoter {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    phone: row.phone,
    commissionPct: num(row.commission_pct),
    active: row.active,
    createdAt: row.created_at,
  };
}

interface OutboxRow {
  id: string;
  event_id: string;
  to_name: string;
  to_phone: string;
  kind: NotificationKind;
  text: string;
  status: OutboxMessage['status'];
  created_at: string;
  sent_at: string | null;
}

export class SupabaseAdapter implements DataAdapter {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  private userId: string | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey);
  }

  async init(): Promise<void> {
    const { data } = await this.sb.auth.getSession();
    if (data.session) {
      this.userId = data.session.user.id;
      return;
    }
    // Sessão anônima: dá ao anfitrião uma identidade estável sem tela de login.
    const { data: signed, error } = await this.sb.auth.signInAnonymously();
    if (error) {
      console.warn('[galera] login anônimo indisponível, seguindo sem identidade:', error.message);
      return;
    }
    this.userId = signed.user?.id ?? null;
  }

  private hydrate(row: EventRow): EventRecord {
    const contacts = new Map(row.guest_contacts?.map((c) => [c.guest_id, c]) ?? []);
    const checkins = new Map(row.checkins?.map((c) => [c.guest_id, c]) ?? []);

    return {
      id: row.id,
      emoji: row.emoji,
      title: row.title,
      date: row.date,
      time: row.time.slice(0, 5),
      location: row.location,
      description: row.description ?? '',
      color: row.color,
      pix: row.pix ?? '',
      createdAt: row.created_at,
      isHost: !!row.host_id && row.host_id === this.userId,
      orgId: row.org_id,
      ticketPrice: num(row.ticket_price),
      capacity: row.capacity,
      guests: row.guests.map((g) => {
        const contact = contacts.get(g.id);
        const checkin = checkins.get(g.id);
        return {
          id: g.id,
          name: g.name,
          status: g.status,
          color: avatarColor(g.name),
          phone: contact?.phone ?? null,
          waOptIn: contact?.wa_opt_in ?? false,
          waOptInAt: contact?.wa_opt_in_at ?? null,
          linkCode: g.link_code,
          checkedInAt: checkin?.checked_in_at ?? null,
          amountPaid: num(checkin?.amount_paid),
        };
      }),
      mural: [...row.mural_posts]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((m) => ({ id: m.id, text: m.text, createdAt: m.created_at })),
      polls: row.polls.map(toPoll),
      photos: row.photos.map(toPhoto),
      links: (row.guest_links ?? []).map(toLink),
    };
  }

  async listEvents(): Promise<EventRecord[]> {
    const ids = knownEventIds();
    const filters = [
      this.userId ? `host_id.eq.${this.userId}` : null,
      ids.length ? `id.in.(${ids.join(',')})` : null,
    ]
      .filter(Boolean)
      .join(',');
    if (!filters) return [];

    const { data, error } = await this.sb.from('events').select(EVENT_SELECT).or(filters).order('date');
    if (error) throw new Error(error.message);
    return (data as unknown as EventRow[]).map((row) => this.hydrate(row));
  }

  async getEvent(id: string): Promise<EventRecord | null> {
    const { data, error } = await this.sb.from('events').select(EVENT_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    addKnownEvent(id);
    return this.hydrate(data as unknown as EventRow);
  }

  async createEvent(input: NewEventInput): Promise<EventRecord> {
    const { data, error } = await this.sb
      .from('events')
      .insert({
        emoji: input.emoji,
        title: input.title,
        date: input.date,
        time: input.time,
        location: input.location,
        description: input.description,
        color: input.color,
        pix: input.pix,
        org_id: input.orgId ?? null,
        ticket_price: input.ticketPrice ?? 0,
        capacity: input.capacity ?? null,
        host_id: this.userId,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    addKnownEvent(data.id);
    const created = await this.getEvent(data.id);
    if (!created) throw new Error('Rolê criado mas não encontrado');
    return created;
  }

  async rsvp(eventId: string, input: RsvpInput): Promise<RsvpResult> {
    // Tudo pela RPC: as policies de escrita direta em `guests` foram removidas
    // na migration 0003 justamente pra forçar a checagem de token aqui dentro.
    const { data, error } = await this.sb
      .rpc('rsvp_upsert', {
        target_event: eventId,
        guest_name: input.name,
        guest_status: input.status,
        guest_phone: input.phone ?? null,
        opt_in: !!input.waOptIn,
        link_code: input.linkCode ?? null,
        token: input.token ?? null,
      })
      .single();
    if (error) {
      if (/name_taken/.test(error.message)) throw new NameTakenError(input.name);
      throw new Error(error.message);
    }
    const row = data as { guest_id: string; guest_token: string };
    return { guestId: row.guest_id, token: row.guest_token };
  }

  async updateEvent(eventId: string, patch: Partial<NewEventInput>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.emoji !== undefined) row.emoji = patch.emoji;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.time !== undefined) row.time = patch.time;
    if (patch.location !== undefined) row.location = patch.location;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.color !== undefined) row.color = patch.color;
    if (patch.pix !== undefined) row.pix = patch.pix;
    if (patch.orgId !== undefined) row.org_id = patch.orgId;
    if (patch.ticketPrice !== undefined) row.ticket_price = patch.ticketPrice;
    if (patch.capacity !== undefined) row.capacity = patch.capacity;
    const { error } = await this.sb.from('events').update(row).eq('id', eventId);
    if (error) throw new Error(error.message);
  }

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.sb.from('events').delete().eq('id', eventId);
    if (error) throw new Error(error.message);
  }

  async setGuestConsent(eventId: string, guestId: string, waOptIn: boolean): Promise<void> {
    const { error } = await this.sb.rpc('set_guest_consent', {
      target_event: eventId,
      target_guest: guestId,
      opt_in: waOptIn,
      token: guestTokenFor(eventId),
    });
    if (error) throw new Error(error.message);
  }

  async deleteGuest(eventId: string, guestId: string): Promise<void> {
    const { error } = await this.sb.rpc('forget_guest', {
      target_event: eventId,
      target_guest: guestId,
      token: guestTokenFor(eventId),
    });
    if (error) throw new Error(error.message);
  }

  async addMuralPost(eventId: string, text: string): Promise<void> {
    const { error } = await this.sb.from('mural_posts').insert({ event_id: eventId, text });
    if (error) throw new Error(error.message);
  }

  async createPoll(eventId: string, question: string, options: string[]): Promise<void> {
    const { data, error } = await this.sb
      .from('polls')
      .insert({ event_id: eventId, question })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    const { error: optError } = await this.sb.from('poll_options').insert(
      options.map((text, position) => ({ poll_id: data.id, event_id: eventId, text, position })),
    );
    if (optError) throw new Error(optError.message);
  }

  async votePoll(eventId: string, pollId: string, optionId: string, voterName: string): Promise<void> {
    const { error } = await this.sb.from('poll_votes').upsert(
      { poll_id: pollId, event_id: eventId, option_id: optionId, voter_name: voterName },
      { onConflict: 'poll_id,voter_key' },
    );
    if (error) throw new Error(error.message);
  }

  async markPollNotified(_eventId: string, pollId: string): Promise<void> {
    const { error } = await this.sb.from('polls').update({ notified: true }).eq('id', pollId);
    if (error) throw new Error(error.message);
  }

  async addPhotos(eventId: string, files: File[], uploader: string): Promise<void> {
    for (const file of files) {
      const { blob } = await downscaleImage(file);
      const path = `${eventId}/${uid()}.jpg`;
      const { error: upErr } = await this.sb.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data } = this.sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const { error } = await this.sb
        .from('photos')
        .insert({ event_id: eventId, storage_path: path, url: data.publicUrl, uploader });
      if (error) throw new Error(error.message);
    }
  }

  subscribe(eventId: string, onChange: () => void): () => void {
    const channel = this.sb.channel(`event:${eventId}`);
    for (const table of REALTIME_TABLES) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: table === 'events' ? `id=eq.${eventId}` : `event_id=eq.${eventId}`,
        },
        () => onChange(),
      );
    }
    channel.subscribe();
    return () => {
      void this.sb.removeChannel(channel);
    };
  }

  /* ---------- B2B ---------- */

  async listOrgs(): Promise<Org[]> {
    const { data, error } = await this.sb.from('orgs').select('id, name, created_at').order('created_at');
    if (error) throw new Error(error.message);
    return data.map((o) => ({ id: o.id, name: o.name, createdAt: o.created_at }));
  }

  async createOrg(name: string): Promise<Org> {
    const { data, error } = await this.sb
      .from('orgs')
      .insert({ name, owner_id: this.userId })
      .select('id, name, created_at')
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, name: data.name, createdAt: data.created_at };
  }

  async listOrgEvents(orgId: string): Promise<EventRecord[]> {
    const { data, error } = await this.sb
      .from('events')
      .select(EVENT_SELECT)
      .eq('org_id', orgId)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as unknown as EventRow[]).map((row) => this.hydrate(row));
  }

  async listPromoters(orgId: string): Promise<Promoter[]> {
    const { data, error } = await this.sb
      .from('promoters')
      .select('id, org_id, name, phone, commission_pct, active, created_at')
      .eq('org_id', orgId)
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data as PromoterRow[]).map(toPromoter);
  }

  async createPromoter(
    orgId: string,
    name: string,
    phone: string | null,
    commissionPct: number,
  ): Promise<Promoter> {
    const { data, error } = await this.sb
      .from('promoters')
      .insert({ org_id: orgId, name, phone, commission_pct: commissionPct })
      .select('id, org_id, name, phone, commission_pct, active, created_at')
      .single();
    if (error) throw new Error(error.message);
    return toPromoter(data as PromoterRow);
  }

  async updatePromoter(
    promoterId: string,
    patch: Partial<Pick<Promoter, 'name' | 'phone' | 'commissionPct' | 'active'>>,
  ): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.commissionPct !== undefined) row.commission_pct = patch.commissionPct;
    if (patch.active !== undefined) row.active = patch.active;
    const { error } = await this.sb.from('promoters').update(row).eq('id', promoterId);
    if (error) throw new Error(error.message);
  }

  async createGuestLink(
    eventId: string,
    input: { label: string; promoterId: string | null; maxUses: number | null },
  ): Promise<GuestLink> {
    const { shortCode } = await import('../lib/format');
    const { data, error } = await this.sb
      .from('guest_links')
      .insert({
        event_id: eventId,
        promoter_id: input.promoterId,
        code: shortCode(),
        label: input.label,
        max_uses: input.maxUses,
      })
      .select('id, event_id, promoter_id, code, label, max_uses, opens, active, created_at')
      .single();
    if (error) throw new Error(error.message);
    return toLink(data as EventRow['guest_links'][number]);
  }

  async registerLinkOpen(eventId: string, code: string): Promise<void> {
    // via RPC: o convidado não tem permissão de ler nem escrever em guest_links
    const { error } = await this.sb.rpc('register_link_open', { target_event: eventId, link_code: code });
    if (error) console.warn('[galera] não consegui registrar a abertura do link:', error.message);
  }

  async checkIn(eventId: string, guestId: string, amountPaid: number): Promise<void> {
    const { error } = await this.sb.from('checkins').upsert(
      {
        guest_id: guestId,
        event_id: eventId,
        checked_in_at: new Date().toISOString(),
        amount_paid: amountPaid,
        checked_by: this.userId,
      },
      { onConflict: 'guest_id' },
    );
    if (error) throw new Error(error.message);
  }

  async undoCheckIn(_eventId: string, guestId: string): Promise<void> {
    const { error } = await this.sb.from('checkins').delete().eq('guest_id', guestId);
    if (error) throw new Error(error.message);
  }

  /* ---------- mensageria ---------- */

  async listOutbox(eventId: string): Promise<OutboxMessage[]> {
    const { data, error } = await this.sb
      .from('outbox_messages')
      .select('id, event_id, to_name, to_phone, kind, text, status, created_at, sent_at')
      .eq('event_id', eventId)
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data as OutboxRow[]).map((m) => ({
      id: m.id,
      eventId: m.event_id,
      toName: m.to_name,
      toPhone: m.to_phone,
      kind: m.kind,
      text: m.text,
      status: m.status,
      createdAt: m.created_at,
      sentAt: m.sent_at,
    }));
  }

  async queueMessages(
    eventId: string,
    messages: { toName: string; toPhone: string; kind: NotificationKind; text: string }[],
  ): Promise<void> {
    if (!messages.length) return;
    const { error } = await this.sb.from('outbox_messages').insert(
      messages.map((m) => ({
        event_id: eventId,
        to_name: m.toName,
        to_phone: m.toPhone,
        kind: m.kind,
        text: m.text,
      })),
    );
    if (error) throw new Error(error.message);
  }

  async markMessageSent(messageId: string): Promise<void> {
    const { error } = await this.sb
      .from('outbox_messages')
      .update({ status: 'enviado', sent_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  }

  async clearOutbox(eventId: string): Promise<void> {
    const { error } = await this.sb.from('outbox_messages').delete().eq('event_id', eventId);
    if (error) throw new Error(error.message);
  }

  /* ---------- instrumentação ---------- */

  async trackEvent(name: string, props: Record<string, unknown>, eventId: string | null): Promise<void> {
    const { error } = await this.sb.from('product_events').insert({ name, props, event_id: eventId });
    // Nunca deixa a interface travar por causa de analytics.
    if (error) console.warn('[galera] trackEvent:', error.message);
  }

  async getFunnelStats(): Promise<Record<string, number>> {
    const { data, error } = await this.sb.from('product_events').select('name');
    if (error) throw new Error(error.message);
    const stats: Record<string, number> = {};
    for (const row of data as { name: string }[]) {
      stats[row.name] = (stats[row.name] ?? 0) + 1;
    }
    return stats;
  }
}
