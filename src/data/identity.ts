import { uid } from '../lib/format';

const DEVICE_KEY = 'galera.device.v1';
const NAME_KEY = 'galera.myname.v1';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* modo privado / storage cheio: seguimos só em memória */
  }
}

let memoryDeviceId: string | null = null;

/** Identidade estável do aparelho — é o "anfitrião" no modo local. */
export function deviceId(): string {
  const stored = safeGet(DEVICE_KEY);
  if (stored) return stored;
  if (!memoryDeviceId) memoryDeviceId = uid();
  safeSet(DEVICE_KEY, memoryDeviceId);
  return memoryDeviceId;
}

/** Nome que o convidado usou por último — evita redigitar a cada rolê. */
export function getMyName(): string {
  return safeGet(NAME_KEY) ?? '';
}

export function setMyName(name: string): void {
  safeSet(NAME_KEY, name.trim());
}

const TOKEN_KEY = 'galera.tokens.v2';

interface StoredTokenEntry {
  token: string;
  guestId: string;
}

function readTokens(): Record<string, StoredTokenEntry> {
  try {
    const raw = safeGet(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredTokenEntry>) : {};
  } catch {
    return {};
  }
}

/** Token que prova a titularidade da resposta neste rolê. */
export function guestTokenFor(eventId: string): string | null {
  return readTokens()[eventId]?.token ?? null;
}

export function rememberGuestToken(eventId: string, token: string, guestId: string): void {
  const tokens = readTokens();
  tokens[eventId] = { token, guestId };
  safeSet(TOKEN_KEY, JSON.stringify(tokens));
}

export function forgetGuestToken(eventId: string): void {
  const tokens = readTokens();
  delete tokens[eventId];
  safeSet(TOKEN_KEY, JSON.stringify(tokens));
}

/**
 * Todo rolê em que este aparelho já respondeu como convidado — a lista que
 * alimenta "apagar meus dados" (LGPD art. 18) sem exigir login.
 */
export function allRememberedGuestRecords(): Array<{ eventId: string; guestId: string }> {
  return Object.entries(readTokens()).map(([eventId, entry]) => ({ eventId, guestId: entry.guestId }));
}
