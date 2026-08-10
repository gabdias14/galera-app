/**
 * Distingue "sem internet" de "erro de verdade" — decide se uma falha vira
 * fila offline (docs/melhorias.md #12) ou uma mensagem de erro normal.
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  // fetch() lança TypeError especificamente quando a requisição não sai do aparelho
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed');
}
