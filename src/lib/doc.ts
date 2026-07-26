/**
 * Últimos 4 dígitos de CPF ou RG — o suficiente pra desempatar homônimo na
 * portaria offline, insuficiente pra reconstruir o documento inteiro. Mesmo
 * padrão que banco usa por telefone ("confirma os 3 últimos dígitos").
 *
 * Propositalmente não guardamos o documento completo: full CPF é dado bem
 * mais sensível que nome+telefone (que já coletamos) e viraria um passivo de
 * LGPD que este produto não precisa carregar pra resolver homônimo na porta.
 */
export function normalizeDocLast4(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}
