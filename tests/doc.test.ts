import { describe, expect, it } from 'vitest';
import { normalizeDocLast4 } from '../src/lib/doc';

describe('normalizeDocLast4', () => {
  it('pega só os últimos 4 dígitos, de CPF ou RG formatado', () => {
    expect(normalizeDocLast4('123.456.789-01')).toBe('8901');
    expect(normalizeDocLast4('12.345.678-9')).toBe('6789');
    expect(normalizeDocLast4('4321')).toBe('4321');
  });

  it('recusa o que não tem dígito suficiente pra ser útil', () => {
    expect(normalizeDocLast4('')).toBeNull();
    expect(normalizeDocLast4('12')).toBeNull();
    expect(normalizeDocLast4('abc')).toBeNull();
  });

  it('nunca devolve mais que 4 dígitos — não dá pra reconstruir o documento', () => {
    const out = normalizeDocLast4('123.456.789-01');
    expect(out).not.toBeNull();
    expect(out!.length).toBe(4);
  });
});
