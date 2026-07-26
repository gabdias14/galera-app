import { describe, expect, it } from 'vitest';
import { avatarColor, escapeHtml, initials, plural, sameName } from '../src/lib/format';

describe('sameName', () => {
  it('trata a mesma pessoa escrita de jeitos diferentes como uma só', () => {
    expect(sameName('João Pedro', 'joao pedro')).toBe(true);
    expect(sameName('  Ana   Silva ', 'ana silva')).toBe(true);
    expect(sameName('Renê', 'rene')).toBe(true);
  });

  it('não confunde pessoas diferentes', () => {
    expect(sameName('Ana Silva', 'Ana Souza')).toBe(false);
  });
});

describe('initials', () => {
  it('usa primeiro e último nome', () => {
    expect(initials('Marina Costa')).toBe('MC');
    expect(initials('Gabriel')).toBe('G');
    expect(initials('Ana Paula Reis')).toBe('AR');
  });
});

describe('escapeHtml', () => {
  it('neutraliza HTML digitado pelo convidado', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });
});

describe('avatarColor', () => {
  it('é estável pro mesmo nome', () => {
    expect(avatarColor('Marina Costa')).toBe(avatarColor('Marina Costa'));
  });
});

describe('plural', () => {
  it('concorda em número', () => {
    expect(`${1} ${plural(1, 'confirmado')}`).toBe('1 confirmado');
    expect(`${3} ${plural(3, 'confirmado')}`).toBe('3 confirmados');
    expect(plural(2, 'mês', 'meses')).toBe('meses');
  });
});
