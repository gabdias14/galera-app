export type ProTab = 'painel' | 'publico' | 'promoters';

export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'event'; id: string; code: string | null }
  | { name: 'edit'; id: string }
  | { name: 'door'; id: string }
  | { name: 'privacidade' }
  | { name: 'entrar' }
  | { name: 'promoter'; token: string }
  | { name: 'pro'; tab: ProTab };

const PRO_TABS: ProTab[] = ['painel', 'publico', 'promoters'];

/**
 * Rotas em hash (`#/e/<id>`) — funcionam em hospedagem estática e dentro do
 * Capacitor, onde a origem é `file://` e não existe history server-side.
 *
 * `#/e/<id>/c/<code>` é o link de convidado: mesmo convite, com atribuição
 * do promoter que trouxe a pessoa.
 */
export function parseRoute(hash: string = location.hash): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts[0] === 'e' && parts[1]) {
    if (parts[2] === 'portaria') return { name: 'door', id: parts[1] };
    if (parts[2] === 'editar') return { name: 'edit', id: parts[1] };
    if (parts[2] === 'c' && parts[3]) return { name: 'event', id: parts[1], code: parts[3].toUpperCase() };
    return { name: 'event', id: parts[1], code: null };
  }
  if (parts[0] === 'novo') return { name: 'create' };
  if (parts[0] === 'privacidade') return { name: 'privacidade' };
  if (parts[0] === 'entrar') return { name: 'entrar' };
  if (parts[0] === 'promoter' && parts[1]) return { name: 'promoter', token: parts[1] };
  if (parts[0] === 'pro') {
    const tab = PRO_TABS.find((t) => t === parts[1]) ?? 'painel';
    return { name: 'pro', tab };
  }
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  if (route.name === 'event') {
    const base = `#/e/${encodeURIComponent(route.id)}`;
    return route.code ? `${base}/c/${encodeURIComponent(route.code)}` : base;
  }
  if (route.name === 'door') return `#/e/${encodeURIComponent(route.id)}/portaria`;
  if (route.name === 'edit') return `#/e/${encodeURIComponent(route.id)}/editar`;
  if (route.name === 'privacidade') return '#/privacidade';
  if (route.name === 'entrar') return '#/entrar';
  if (route.name === 'promoter') return `#/promoter/${encodeURIComponent(route.token)}`;
  if (route.name === 'create') return '#/novo';
  if (route.name === 'pro') return `#/pro/${route.tab}`;
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

/**
 * Link público do convite, pronto pra colar no WhatsApp.
 *
 * `src` vira query string (antes do hash, já que a rota é hash-based) — é o
 * que permite provar, quando o link é aberto, que a instalação veio de um
 * Recap compartilhado e não de outro canal (fecha o K-factor do #7).
 */
export function inviteUrl(eventId: string, code?: string | null, src?: string): string {
  const base = import.meta.env.VITE_PUBLIC_URL || `${location.origin}${location.pathname}`;
  const clean = base.replace(/\/$/, '');
  const path = code
    ? `/e/${encodeURIComponent(eventId)}/c/${encodeURIComponent(code)}`
    : `/e/${encodeURIComponent(eventId)}`;
  const query = src ? `?src=${encodeURIComponent(src)}` : '';
  return `${clean}/${query}#${path}`;
}

/** Link que a produtora manda pro promoter — sem login, token na URL. */
export function promoterUrl(publicToken: string): string {
  const base = import.meta.env.VITE_PUBLIC_URL || `${location.origin}${location.pathname}`;
  const clean = base.replace(/\/$/, '');
  return `${clean}/#/promoter/${encodeURIComponent(publicToken)}`;
}
