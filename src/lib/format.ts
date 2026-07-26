const AVATAR_PALETTE = ['#FF5A72', '#FFC94D', '#29D398', '#8B6FF0', '#3FB8E0', '#FF9F5A'];

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(name: string): string {
  return AVATAR_PALETTE[hashStr(name) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  let s = parts[0] ? parts[0][0] : '?';
  if (parts.length > 1) s += parts[parts.length - 1][0];
  return s.toUpperCase();
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: unknown): string {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Compara nomes de convidado (case/acento-insensível, espaços normalizados). */
export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? singular : (pluralForm ?? singular + 's');
}
