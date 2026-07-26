/** Modelo de domínio do Galera. Compartilhado entre a UI e os adaptadores de dados. */

export type RsvpStatus = 'vou' | 'talvez' | 'nao';

export type ThemeColor = 'coral' | 'yellow' | 'green' | 'purple';

export interface Guest {
  id: string;
  name: string;
  status: RsvpStatus;
  /** Cor do avatar — derivada do nome, não persistida. */
  color: string;
}

export interface MuralPost {
  id: string;
  text: string;
  /** ISO 8601. */
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  /** optionId -> nomes de quem votou. */
  votes: Record<string, string[]>;
  notified: boolean;
}

export interface Photo {
  id: string;
  /** URL da imagem (data: em modo local, URL pública do Storage no Supabase). */
  url: string | null;
  caption: string;
  uploader: string;
  /** Fotos de exemplo do seed: renderizadas como gradiente + emoji. */
  placeholder?: boolean;
  emoji?: string;
  gradient?: string;
}

export interface EventRecord {
  id: string;
  emoji: string;
  title: string;
  /** 'YYYY-MM-DD' — data local, sem fuso. */
  date: string;
  /** 'HH:MM'. */
  time: string;
  location: string;
  description: string;
  color: ThemeColor;
  pix: string;
  createdAt: string;
  /** true quando o usuário atual é o anfitrião deste rolê. */
  isHost: boolean;
  guests: Guest[];
  mural: MuralPost[];
  polls: Poll[];
  photos: Photo[];
}

export interface NewEventInput {
  emoji: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  color: ThemeColor;
  pix: string;
}

/**
 * Contrato de persistência. `local` (localStorage) e `supabase` implementam
 * o mesmo contrato, então a UI não sabe qual backend está rodando.
 */
export interface DataAdapter {
  readonly kind: 'local' | 'supabase';
  init(): Promise<void>;
  /** Rolês que o usuário atual criou ou de que participa. */
  listEvents(): Promise<EventRecord[]>;
  getEvent(id: string): Promise<EventRecord | null>;
  createEvent(input: NewEventInput): Promise<EventRecord>;
  rsvp(eventId: string, name: string, status: RsvpStatus): Promise<void>;
  addMuralPost(eventId: string, text: string): Promise<void>;
  createPoll(eventId: string, question: string, options: string[]): Promise<void>;
  votePoll(eventId: string, pollId: string, optionId: string, voterName: string): Promise<void>;
  markPollNotified(eventId: string, pollId: string): Promise<void>;
  addPhotos(eventId: string, files: File[], uploader: string): Promise<void>;
  /** Notifica mudanças no evento (realtime no Supabase, `storage` event no local). */
  subscribe(eventId: string, onChange: () => void): () => void;
}
