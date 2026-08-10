const KEY = 'galera.known.v1';

/**
 * Ids de rolês que este aparelho conhece (criou ou abriu por link).
 * É o que alimenta a home — o link do convite é a chave de acesso.
 */
export function knownEventIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addKnownEvent(id: string): void {
  const ids = knownEventIds();
  if (ids.includes(id)) return;
  ids.unshift(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200)));
  } catch {
    /* ignora: só perde o atalho na home */
  }
}
