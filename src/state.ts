import type { EventRecord, ThemeColor } from './types';
import type { Route } from './router';
import { getMyName } from './data/identity';

export type EventTab = 'convite' | 'convidados' | 'enquete' | 'mural' | 'album';

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
  busy: boolean;
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
  guestMode: false,
  eventTab: 'convite',
  myName: getMyName(),
  showPollForm: false,
  lightboxPhotoId: null,
  recapOpen: false,
  recapLoading: false,
  recapUrl: null,
  busy: false,
};
