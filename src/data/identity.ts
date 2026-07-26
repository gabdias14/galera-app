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
