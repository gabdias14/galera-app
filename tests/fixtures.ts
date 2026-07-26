import type { EventRecord, Guest, RsvpStatus } from '../src/types';

export function makeGuest(name: string, status: RsvpStatus, extra: Partial<Guest> = {}): Guest {
  return {
    id: `g-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    status,
    color: '#fff',
    phone: null,
    waOptIn: false,
    waOptInAt: null,
    linkCode: null,
    checkedInAt: null,
    amountPaid: 0,
    ...extra,
  };
}

export function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    emoji: '🍖',
    title: 'Churrasco do Gabriel',
    date: '2026-08-14',
    time: '13:00',
    location: 'Vila Madalena, SP',
    description: '',
    color: 'coral',
    pix: '',
    createdAt: '2026-07-01T12:00:00.000Z',
    isHost: true,
    orgId: null,
    ticketPrice: 0,
    capacity: null,
    guests: [],
    mural: [],
    polls: [],
    photos: [],
    links: [],
    ...overrides,
  };
}
