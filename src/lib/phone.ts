/**
 * Telefones brasileiros. Guardamos sempre em E.164 sem o '+' (5511987654321),
 * que é o formato que o link do WhatsApp e a Cloud API esperam.
 */

const DDI = '55';

export function normalizePhoneBR(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input);

  // DDD entre parênteses é declaração explícita: "(01)" é erro de digitação,
  // não o 0 de operadora. Sem essa checagem, "(01) 98765-4321" viraria DDD 19
  // e a mensagem sairia pro número errado.
  const paren = raw.match(/\((\d{1,3})\)/);
  if (paren && !isValidDDD(paren[1])) return null;

  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // tira o 0 de operadora ("0 11 9...") e o 00 internacional
  digits = digits.replace(/^0+/, '');

  if (digits.startsWith(DDI) && (digits.length === 12 || digits.length === 13)) {
    return isValidBR(digits) ? digits : null;
  }
  // número sem DDI: 10 dígitos (fixo) ou 11 (celular com 9)
  if (digits.length === 10 || digits.length === 11) {
    const full = DDI + digits;
    return isValidBR(full) ? full : null;
  }
  return null;
}

function isValidDDD(ddd: string): boolean {
  const n = parseInt(ddd, 10);
  return ddd.length === 2 && n >= 11 && n <= 99;
}

function isValidBR(e164: string): boolean {
  if (!e164.startsWith(DDI)) return false;
  const rest = e164.slice(2);
  if (rest.length !== 10 && rest.length !== 11) return false;
  // DDDs válidos no Brasil vão de 11 a 99
  if (!isValidDDD(rest.slice(0, 2))) return false;
  // celular tem 9 dígitos e começa com 9
  if (rest.length === 11 && rest[2] !== '9') return false;
  return true;
}

/** '5511987654321' -> '(11) 98765-4321' */
export function formatPhoneBR(e164: string | null): string {
  if (!e164) return '';
  const rest = e164.startsWith(DDI) ? e164.slice(2) : e164;
  if (rest.length === 11) return `(${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
  if (rest.length === 10) return `(${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6)}`;
  return e164;
}

/** Link que abre a conversa no WhatsApp com a mensagem pronta. */
export function waLink(phone: string | null, text: string): string {
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
