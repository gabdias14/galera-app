/** Modelo de domínio do Galera. Compartilhado entre a UI e os adaptadores de dados. */

export type RsvpStatus = 'vou' | 'talvez' | 'nao';

export type ThemeColor = 'coral' | 'yellow' | 'green' | 'purple';

export interface Guest {
  id: string;
  name: string;
  status: RsvpStatus;
  /** Cor do avatar — derivada do nome, não persistida. */
  color: string;
  /** Telefone em formato E.164 sem '+' (ex.: 5511987654321). */
  phone: string | null;
  /** Consentimento explícito pra receber mensagem no WhatsApp (LGPD). */
  waOptIn: boolean;
  /** Quando o opt-in foi dado — é a prova do consentimento. */
  waOptInAt: string | null;
  /** Código do link de convidado por onde essa pessoa entrou (atribuição).
   *  `PORTARIA` = chegou sem convite, foi adicionada na porta. */
  linkCode: string | null;
  /** Check-in na portaria. */
  checkedInAt: string | null;
  /** Quanto pagou (ingresso/consumação), em reais. */
  amountPaid: number;
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

/** Link rastreável de convite — a unidade de atribuição do B2B. */
export interface GuestLink {
  id: string;
  eventId: string;
  /** Código curto que vai na URL: #/e/<id>/c/<code>. */
  code: string;
  label: string;
  /** Promoter dono do link (null = link da casa). */
  promoterId: string | null;
  /** Limite de confirmações; null = sem limite. */
  maxUses: number | null;
  /** Quantas vezes o link foi aberto. */
  opens: number;
  createdAt: string;
  active: boolean;
}

export interface Promoter {
  id: string;
  orgId: string;
  name: string;
  phone: string | null;
  /** Comissão sobre a receita atribuída, em %. */
  commissionPct: number;
  active: boolean;
  createdAt: string;
}

export interface Org {
  id: string;
  name: string;
  createdAt: string;
}

export type NotificationKind = 'convite' | 'lembrete' | 'enquete' | 'campanha';
export type NotificationStatus = 'pendente' | 'enviado' | 'falhou';

/** Fila de mensagens. Cada linha é uma mensagem pra uma pessoa. */
export interface OutboxMessage {
  id: string;
  eventId: string;
  /** Nome de quem recebe (o destinatário pode não ser guest ainda, numa campanha). */
  toName: string;
  toPhone: string;
  kind: NotificationKind;
  text: string;
  status: NotificationStatus;
  createdAt: string;
  sentAt: string | null;
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
  /** Organização dona do rolê — presente só nos eventos B2B. */
  orgId: string | null;
  /** Preço do ingresso em reais (0 = grátis). Usado pra projetar receita. */
  ticketPrice: number;
  /** Lotação máxima; null = sem limite. */
  capacity: number | null;
  guests: Guest[];
  mural: MuralPost[];
  polls: Poll[];
  photos: Photo[];
  links: GuestLink[];
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
  orgId?: string | null;
  ticketPrice?: number;
  capacity?: number | null;
}

export interface RsvpInput {
  name: string;
  status: RsvpStatus;
  phone?: string | null;
  waOptIn?: boolean;
  linkCode?: string | null;
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
  rsvp(eventId: string, input: RsvpInput): Promise<void>;
  addMuralPost(eventId: string, text: string): Promise<void>;
  createPoll(eventId: string, question: string, options: string[]): Promise<void>;
  votePoll(eventId: string, pollId: string, optionId: string, voterName: string): Promise<void>;
  markPollNotified(eventId: string, pollId: string): Promise<void>;
  addPhotos(eventId: string, files: File[], uploader: string): Promise<void>;
  /** Notifica mudanças no evento (realtime no Supabase, `storage` event no local). */
  subscribe(eventId: string, onChange: () => void): () => void;

  /* ---------- B2B ---------- */

  /** Organizações que o usuário atual administra. */
  listOrgs(): Promise<Org[]>;
  createOrg(name: string): Promise<Org>;
  /** Todos os rolês de uma organização, com convidados — base da audiência. */
  listOrgEvents(orgId: string): Promise<EventRecord[]>;

  listPromoters(orgId: string): Promise<Promoter[]>;
  createPromoter(orgId: string, name: string, phone: string | null, commissionPct: number): Promise<Promoter>;
  updatePromoter(promoterId: string, patch: Partial<Pick<Promoter, 'name' | 'phone' | 'commissionPct' | 'active'>>): Promise<void>;

  createGuestLink(
    eventId: string,
    input: { label: string; promoterId: string | null; maxUses: number | null },
  ): Promise<GuestLink>;
  /** Registra a abertura do link (métrica de conversão do promoter). */
  registerLinkOpen(eventId: string, code: string): Promise<void>;

  /** Portaria: marca presença. `amountPaid` entra no LTV do contato. */
  checkIn(eventId: string, guestId: string, amountPaid: number): Promise<void>;
  undoCheckIn(eventId: string, guestId: string): Promise<void>;

  /* ---------- mensageria ---------- */

  listOutbox(eventId: string): Promise<OutboxMessage[]>;
  queueMessages(
    eventId: string,
    messages: { toName: string; toPhone: string; kind: NotificationKind; text: string }[],
  ): Promise<void>;
  markMessageSent(messageId: string): Promise<void>;
  /** Esvazia a fila de um rolê (recomeçar uma campanha). */
  clearOutbox(eventId: string): Promise<void>;
}
