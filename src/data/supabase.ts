import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DataAdapter,
  EventRecord,
  NewEventInput,
  Photo,
  Poll,
  RsvpStatus,
  ThemeColor,
} from '../types';
import { avatarColor, uid } from '../lib/format';
import { downscaleImage } from '../lib/image';
import { addKnownEvent, knownEventIds } from './known';

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
  guests: { id: string; name: string; status: RsvpStatus }[];
  mural_posts: { id: string; text: string; created_at: string }[];
  polls: {
    id: string;
    question: string;
    notified: boolean;
    poll_options: { id: string; text: string; position: number }[];
    poll_votes: { option_id: string; voter_name: string }[];
  }[];
  photos: {
    id: string;
    url: string | null;
    caption: string | null;
    uploader: string | null;
  }[];
}

const EVENT_SELECT = `
  id, host_id, emoji, title, date, time, location, description, color, pix, created_at,
  guests ( id, name, status ),
  mural_posts ( id, text, created_at ),
  polls ( id, question, notified, poll_options ( id, text, position ), poll_votes ( option_id, voter_name ) ),
  photos ( id, url, caption, uploader )
`;

const REALTIME_TABLES = ['events', 'guests', 'mural_posts', 'polls', 'poll_options', 'poll_votes', 'photos'];

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
      guests: row.guests.map((g) => ({ ...g, color: avatarColor(g.name) })),
      mural: [...row.mural_posts]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((m) => ({ id: m.id, text: m.text, createdAt: m.created_at })),
      polls: row.polls.map(toPoll),
      photos: row.photos.map(toPhoto),
    };
  }

  async listEvents(): Promise<EventRecord[]> {
    const ids = knownEventIds();
    const filters = [this.userId ? `host_id.eq.${this.userId}` : null, ids.length ? `id.in.(${ids.join(',')})` : null]
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
      .insert({ ...input, host_id: this.userId })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    addKnownEvent(data.id);
    const created = await this.getEvent(data.id);
    if (!created) throw new Error('Rolê criado mas não encontrado');
    return created;
  }

  async rsvp(eventId: string, name: string, status: RsvpStatus): Promise<void> {
    // `name_key` é gerado no banco a partir do nome; o índice único dele faz o upsert.
    const { error } = await this.sb
      .from('guests')
      .upsert({ event_id: eventId, name, status }, { onConflict: 'event_id,name_key' });
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
}
