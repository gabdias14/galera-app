import { describe, expect, it } from 'vitest';
import type { Org, Plan } from '../src/types';
import { can, checkoutUrl, isPro } from '../src/lib/plan';

function org(plan: Plan): Org {
  return { id: 'o1', name: 'Aurora Produções', createdAt: '2026-01-01T00:00:00.000Z', plan };
}

describe('entitlements', () => {
  it('libera tudo no Pro', () => {
    const pro = org('pro');
    expect(isPro(pro)).toBe(true);
    for (const f of ['campanha', 'promoters', 'portaria', 'exportar'] as const) {
      expect(can(pro, f)).toBe(true);
    }
  });

  it('bloqueia os recursos pagos no grátis', () => {
    const free = org('free');
    expect(isPro(free)).toBe(false);
    for (const f of ['campanha', 'promoters', 'portaria', 'exportar'] as const) {
      expect(can(free, f)).toBe(false);
    }
  });

  it('trata produtora ausente como grátis — nunca libera por omissão', () => {
    expect(isPro(null)).toBe(false);
    expect(isPro(undefined)).toBe(false);
    expect(can(null, 'portaria')).toBe(false);
    expect(can(undefined, 'campanha')).toBe(false);
  });
});

describe('checkout', () => {
  it('aponta pra fora do app — comissão de loja só existe em compra no app', () => {
    const url = checkoutUrl(org('free'));
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain('/assinar');
    expect(url).toContain('org=o1');
  });

  it('funciona sem produtora', () => {
    expect(checkoutUrl(null)).toContain('/assinar');
  });
});
