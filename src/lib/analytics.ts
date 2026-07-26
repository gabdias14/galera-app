import type { DataAdapter } from '../types';

/**
 * Instrumentação do loop de crescimento (backlog #7) e observabilidade
 * mínima de erro em produção (backlog #25) — sem depender de conta externa
 * (Sentry etc.), pra funcionar no dia 1.
 *
 * Os nomes de evento em português são os que aparecem nos números do
 * `docs/business-plan.md` — quem for calcular o K-factor lê estas linhas.
 */
export type ProductEvent =
  | 'app_aberto'
  | 'role_criado'
  | 'rsvp'
  | 'recap_gerado'
  | 'recap_compartilhado'
  | 'convite_aberto_via_recap'
  | 'erro_js';

let adapter: DataAdapter | null = null;

export function initAnalytics(a: DataAdapter): void {
  adapter = a;
}

/** Fire-and-forget: analytics nunca deve travar nem quebrar a ação do usuário. */
export function track(name: ProductEvent, props: Record<string, unknown> = {}, eventId: string | null = null): void {
  if (!adapter) return;
  adapter.trackEvent(name, props, eventId).catch((err) => {
    console.warn('[galera] falha ao registrar evento de produto:', name, err);
  });
}

const MAX_ERROR_REPORTS_PER_SESSION = 20;
let errorCount = 0;

function reportError(message: string, extra: Record<string, unknown> = {}): void {
  if (errorCount >= MAX_ERROR_REPORTS_PER_SESSION) return;
  errorCount += 1;
  track('erro_js', { message: message.slice(0, 500), ...extra });
}

/**
 * Captura global de erro. É o "observability" possível sem uma conta de
 * terceiro configurada — ver docs/melhorias.md #25 pro caminho até Sentry.
 */
export function installErrorReporting(): void {
  window.addEventListener('error', (e) => {
    reportError(e.message, { source: e.filename, line: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    reportError(reason, { kind: 'promise_rejeitada' });
  });
}
