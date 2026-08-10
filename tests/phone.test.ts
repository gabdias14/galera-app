import { describe, expect, it } from 'vitest';
import { formatPhoneBR, normalizePhoneBR, waLink } from '../src/lib/phone';

describe('normalizePhoneBR', () => {
  it('aceita os formatos que a galera digita', () => {
    expect(normalizePhoneBR('(11) 98765-4321')).toBe('5511987654321');
    expect(normalizePhoneBR('11987654321')).toBe('5511987654321');
    expect(normalizePhoneBR('+55 11 98765 4321')).toBe('5511987654321');
    expect(normalizePhoneBR('5511987654321')).toBe('5511987654321');
    expect(normalizePhoneBR('011 98765-4321')).toBe('5511987654321');
  });

  it('aceita fixo com 10 dígitos', () => {
    expect(normalizePhoneBR('(11) 3255-1000')).toBe('551132551000');
  });

  it('recusa o que não dá pra mandar mensagem', () => {
    expect(normalizePhoneBR('')).toBeNull();
    expect(normalizePhoneBR(null)).toBeNull();
    expect(normalizePhoneBR('123')).toBeNull();
    expect(normalizePhoneBR('98765-4321')).toBeNull(); // sem DDD
    expect(normalizePhoneBR('(01) 98765-4321')).toBeNull(); // DDD inexistente
    expect(normalizePhoneBR('(11) 88765-4321')).toBeNull(); // celular tem que começar com 9
  });
});

describe('formatPhoneBR', () => {
  it('devolve o formato brasileiro pra leitura', () => {
    expect(formatPhoneBR('5511987654321')).toBe('(11) 98765-4321');
    expect(formatPhoneBR('551132551000')).toBe('(11) 3255-1000');
    expect(formatPhoneBR(null)).toBe('');
  });
});

describe('waLink', () => {
  it('monta o link do WhatsApp com a mensagem codificada', () => {
    const link = waLink('5511987654321', 'Bora? 🎉');
    expect(link.startsWith('https://wa.me/5511987654321?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Bora? 🎉');
  });

  it('sem número, abre o seletor de contato', () => {
    expect(waLink(null, 'oi').startsWith('https://wa.me/?text=')).toBe(true);
  });
});
