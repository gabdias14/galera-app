export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'event'; id: string };

/**
 * Rotas em hash (`#/e/<id>`) — funcionam em hospedagem estática e dentro do
 * Capacitor, onde a origem é `file://` e não existe history server-side.
 */
export function parseRoute(hash: string = location.hash): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'e' && parts[1]) return { name: 'event', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'novo') return { name: 'create' };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  if (route.name === 'event') return `#/e/${encodeURIComponent(route.id)}`;
  if (route.name === 'create') return '#/novo';
  return '#/';
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

export function onRouteChange(cb: (route: Route) => void): void {
  window.addEventListener('hashchange', () => cb(parseRoute()));
}

/** Link público do convite, pronto pra colar no WhatsApp. */
export function inviteUrl(eventId: string): string {
  const base = import.meta.env.VITE_PUBLIC_URL || `${location.origin}${location.pathname}`;
  return `${base.replace(/\/$/, '')}/#/e/${encodeURIComponent(eventId)}`;
}
