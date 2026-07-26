import { describe, expect, it } from 'vitest';
import type { Expense } from '../src/types';
import { settle, summaryFor } from '../src/lib/split';

function expense(partial: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy'>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    description: 'Compra',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/** Um rateio só fecha se ninguém sumir com centavo: a soma dos saldos é zero. */
function sumBalances(balances: { balance: number }[]): number {
  return Math.round(balances.reduce((acc, b) => acc + b.balance, 0) * 100);
}

describe('settle', () => {
  it('sem despesa, não há nada a acertar', () => {
    const s = settle([], ['Ana', 'Bruno']);
    expect(s.total).toBe(0);
    expect(s.balances).toEqual([]);
    expect(s.transfers).toEqual([]);
  });

  it('divide igualmente entre quem confirmou quando a despesa não diz quem racha', () => {
    const s = settle([expense({ amount: 90, paidBy: 'Ana' })], ['Ana', 'Bruno', 'Carla']);
    expect(s.total).toBe(90);
    const ana = s.balances.find((b) => b.name === 'Ana')!;
    expect(ana.paid).toBe(90);
    expect(ana.owes).toBe(30);
    expect(ana.balance).toBe(60);
    expect(sumBalances(s.balances)).toBe(0);
  });

  it('quem pagou entra no rateio mesmo sem ter dado RSVP', () => {
    // o anfitrião compra a carne e não está na própria lista de convidados
    const s = settle([expense({ amount: 100, paidBy: 'Gabriel' })], ['Ana', 'Bruno']);
    expect(s.balances.map((b) => b.name).sort()).toEqual(['Ana', 'Bruno', 'Gabriel']);
    // 100 entre 3 não fecha redondo: cada um fica com ~33,33 e a soma bate 100
    const gabriel = s.balances.find((b) => b.name === 'Gabriel')!;
    expect(gabriel.owes).toBeGreaterThan(33.32);
    expect(gabriel.owes).toBeLessThan(33.35);
    expect(gabriel.paid).toBe(100);
    const totalDevido = Math.round(s.balances.reduce((a, b) => a + b.owes, 0) * 100);
    expect(totalDevido).toBe(10000);
  });

  it('respeita o grupo explícito da despesa', () => {
    const s = settle(
      [expense({ amount: 60, paidBy: 'Ana', sharedWith: ['Ana', 'Bruno'] })],
      ['Ana', 'Bruno', 'Carla'],
    );
    expect(s.balances.find((b) => b.name === 'Carla')).toBeUndefined();
    expect(s.balances.find((b) => b.name === 'Bruno')!.balance).toBe(-30);
  });

  it('não perde centavo em divisão inexata', () => {
    const s = settle([expense({ amount: 10, paidBy: 'Ana' })], ['Ana', 'Bruno', 'Carla']);
    expect(sumBalances(s.balances)).toBe(0);
    const owed = s.balances.map((b) => Math.round(b.owes * 100)).sort((a, b) => a - b);
    expect(owed).toEqual([333, 333, 334]);
  });

  it('soma várias despesas de pagadores diferentes', () => {
    const s = settle(
      [
        expense({ description: 'Carne', amount: 180, paidBy: 'Gabriel' }),
        expense({ description: 'Cerveja', amount: 120, paidBy: 'Ana' }),
        expense({ description: 'Gelo', amount: 30, paidBy: 'Bruno' }),
      ],
      ['Gabriel', 'Ana', 'Bruno'],
    );
    expect(s.total).toBe(330);
    expect(s.perHead).toBe(110);
    expect(s.balances.find((b) => b.name === 'Gabriel')!.balance).toBe(70);
    expect(s.balances.find((b) => b.name === 'Ana')!.balance).toBe(10);
    expect(s.balances.find((b) => b.name === 'Bruno')!.balance).toBe(-80);
    expect(sumBalances(s.balances)).toBe(0);
  });

  it('trata o mesmo nome escrito diferente como uma pessoa só', () => {
    const s = settle(
      [expense({ amount: 100, paidBy: 'ana' }), expense({ amount: 50, paidBy: 'ANA' })],
      ['Ana', 'Bruno'],
    );
    expect(s.balances).toHaveLength(2);
    expect(s.balances.find((b) => b.name.toLowerCase() === 'ana')!.paid).toBe(150);
  });

  it('ignora despesa com valor zero ou negativo', () => {
    const s = settle(
      [expense({ amount: 0, paidBy: 'Ana' }), expense({ amount: -20, paidBy: 'Ana' })],
      ['Ana', 'Bruno'],
    );
    expect(s.total).toBe(0);
    expect(s.transfers).toEqual([]);
  });

  it('quem pagou arca sozinho quando não há ninguém pra ratear', () => {
    const s = settle([expense({ amount: 40, paidBy: 'Ana' })], []);
    expect(s.balances).toHaveLength(1);
    expect(s.balances[0].balance).toBe(0);
    expect(s.transfers).toEqual([]);
  });
});

describe('transferências', () => {
  it('zera os saldos e não cria transferência a mais que o necessário', () => {
    const s = settle(
      [
        expense({ amount: 180, paidBy: 'Gabriel' }),
        expense({ amount: 120, paidBy: 'Ana' }),
        expense({ amount: 30, paidBy: 'Bruno' }),
      ],
      ['Gabriel', 'Ana', 'Bruno'],
    );
    // só o Bruno está devendo: uma transferência por credor, no máximo
    expect(s.transfers.every((t) => t.from === 'Bruno')).toBe(true);
    const totalTransferido = Math.round(s.transfers.reduce((a, t) => a + t.amount, 0) * 100);
    expect(totalTransferido).toBe(8000);
  });

  it('cada transferência sai de quem deve pra quem tem a receber', () => {
    const s = settle(
      [expense({ amount: 300, paidBy: 'Ana' }), expense({ amount: 60, paidBy: 'Bruno' })],
      ['Ana', 'Bruno', 'Carla', 'Davi'],
    );
    for (const t of s.transfers) {
      expect(s.balances.find((b) => b.name === t.from)!.balance).toBeLessThan(0);
      expect(s.balances.find((b) => b.name === t.to)!.balance).toBeGreaterThan(0);
      expect(t.amount).toBeGreaterThan(0);
    }
    // o que sai de cada devedor bate com o que ele deve
    const pagoPorCarla = s.transfers
      .filter((t) => t.from === 'Carla')
      .reduce((a, t) => a + t.amount, 0);
    expect(Math.round(pagoPorCarla * 100)).toBe(9000);
  });
});

describe('summaryFor', () => {
  it('mostra o que a pessoa tem a pagar', () => {
    const s = settle(
      [expense({ amount: 180, paidBy: 'Gabriel' })],
      ['Gabriel', 'Ana', 'Bruno'],
    );
    const ana = summaryFor('Ana', s);
    expect(ana.balance!.balance).toBe(-60);
    expect(ana.pay).toEqual([{ from: 'Ana', to: 'Gabriel', amount: 60 }]);
    expect(ana.receive).toEqual([]);
  });

  it('mostra o que a pessoa tem a receber, ignorando maiúscula/acento', () => {
    const s = settle([expense({ amount: 180, paidBy: 'Gabriel' })], ['Gabriel', 'Ana']);
    const gabriel = summaryFor('gabriel', s);
    expect(gabriel.balance!.balance).toBe(90);
    expect(gabriel.receive).toHaveLength(1);
    expect(gabriel.pay).toEqual([]);
  });

  it('devolve vazio pra nome desconhecido', () => {
    const s = settle([expense({ amount: 10, paidBy: 'Ana' })], ['Ana']);
    expect(summaryFor('Ninguém', s).balance).toBeNull();
    expect(summaryFor('', s).balance).toBeNull();
  });
});
