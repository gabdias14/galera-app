import type { EventRecord, Org, OutboxMessage, Promoter, PromoterView, ThemeColor } from './types';
import type { ProTab, Route } from './router';
import type { AudienceFilter, ScoredContact } from './lib/audience';
import { getMyName } from './data/identity';

export type EventTab = 'convite' | 'convidados' | 'enquete' | 'mural' | 'album' | 'links';

export interface AppState {
  route: Route;
  loading: boolean;
  error: string | null;
  /** Backend em uso — muda a mensagem quando um convite não é encontrado. */
  backend: 'local' | 'supabase';
  /** Rolês da home. */
  events: EventRecord[];
  /** Rolê aberto no momento. */
  event: EventRecord | null;
  /** Código do link de convidado pelo qual a pessoa chegou (atribuição). */
  linkCode: string | null;
  /** Ver como convidado (o anfitrião pode alternar; quem não é host fica sempre aqui). */
  guestMode: boolean;
  eventTab: EventTab;
  /** Nome com que o usuário responde RSVP e vota. */
  myName: string;
  showPollForm: boolean;
  lightboxPhotoId: string | null;
  recapOpen: boolean;
  recapLoading: boolean;
  recapUrl: string | null;
  /** Título e id usados no compartilhar/baixar — id null pro recap de temporada (sem rolê único). */
  recapTitle: string;
  recapEventId: string | null;
  busy: boolean;

  /* ---------- Galera Pro ---------- */
  proTab: ProTab;
  orgs: Org[];
  orgId: string | null;
  orgEvents: EventRecord[];
  promoters: Promoter[];
  /** Base de contatos já pontuada. */
  audience: ScoredContact[];
  audienceFilter: AudienceFilter;
  campaignEventId: string | null;
  campaignPromoterId: string | null;
  /** Fila de mensagens do rolê aberto (ou do alvo da campanha). */
  outbox: OutboxMessage[];
  /** Painel público do promoter (`#/promoter/<token>`) — sem login. */
  promoterView: PromoterView | null;

  /* ---------- portaria ---------- */
  doorSearch: string;
  doorAmount: number | null;
  doorScannerOpen: boolean;
  doorScannerError: string | null;
}

export const COLORS: Record<ThemeColor, { tint: string; accent: string }> = {
  coral: { tint: '#FFE1E4', accent: 'var(--coral)' },
  yellow: { tint: '#FFF0CE', accent: 'var(--yellow)' },
  green: { tint: '#D9F7EB', accent: 'var(--green)' },
  purple: { tint: '#E9E2FF', accent: 'var(--purple)' },
};

export const EMOJIS = ['🎉', '🍖', '🎂', '🏖️', '🎮', '🍻', '🎸', '🕺', '🔥', '🌮'];

export const state: AppState = {
  route: { name: 'home' },
  loading: true,
  error: null,
  backend: 'local',
  events: [],
  event: null,
  linkCode: null,
  guestMode: false,
  eventTab: 'convite',
  myName: getMyName(),
  showPollForm: false,
  lightboxPhotoId: null,
  recapOpen: false,
  recapLoading: false,
  recapUrl: null,
  recapTitle: '',
  recapEventId: null,
  busy: false,

  proTab: 'painel',
  orgs: [],
  orgId: null,
  orgEvents: [],
  promoters: [],
  audience: [],
  audienceFilter: { size: 50 },
  campaignEventId: null,
  campaignPromoterId: null,
  outbox: [],
  promoterView: null,

  doorSearch: '',
  doorAmount: null,
  doorScannerOpen: false,
  doorScannerError: null,
};
