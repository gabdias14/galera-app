import type { Expense } from '../types';
import { normalizeName } from './format';

/**
 * Divisão de custos do rolê ("quem pagou o quê, quem deve pra quem").
 *
 * A dor: no churrasco cada um compra uma coisa — carne, cerveja, gelo — e no
 * fim ninguém sabe quem está no vermelho. A planilha do grupo resolve mal e a
 * cobrança um-a-um gera atrito. Aqui isso vira um saldo por pessoa e uma
 * lista curta de transferências.
 *
 * Tudo é calculado em centavos (inteiro) porque somar reais em ponto
 * flutuante acumula erro: 0.1 + 0.2 !== 0.3. Só na borda volta pra reais.
 */

export interface PersonBalance {
  name: string;
  /** Quanto essa pessoa desembolsou. */
  paid: number;
  /** Quanto do consumo é dela. */
  owes: number;
  /** paid − owes. Positivo = tem a receber; negativo = deve. */
  balance: number;
}

/** "Fulano paga R$ X pra Beltrano" — o que zera as contas. */
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  total: number;
  /** Média por participante — referência, não o que cada um deve de fato. */
  perHead: number;
  /** Quem tem mais a receber primeiro, quem mais deve por último. */
  balances: PersonBalance[];
  transfers: Transfer[];
}

const toCents = (v: number): number => Math.round(v * 100);
const toReais = (c: number): number => c / 100;

/** Remove repetidos por nome normalizado, preservando a grafia digitada. */
function dedupNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = normalizeName(name);
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return [...seen.values()];
}

/**
 * Divide centavos entre N pessoas sem perder nem inventar centavo: o resto
 * vai de um em um pros primeiros, então a soma bate exatamente com o total.
 * Ex.: 10,00 entre 3 → 3,34 / 3,33 / 3,33.
 */
function splitCents(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * @param expenses  despesas lançadas no rolê
 * @param confirmed nomes de quem confirmou presença — o grupo padrão do
 *                  rateio, usado quando a despesa não diz "quem racha".
 *
 * Quem pagou algo entra no grupo padrão mesmo sem ter dado RSVP: o anfitrião
 * compra a carne e não aparece na própria lista de convidados.
 */
export function settle(expenses: Expense[], confirmed: string[]): Settlement {
  /** nome normalizado -> grafia a exibir */
  const display = new Map<string, string>();
  const remember = (name: string): string => {
    const key = normalizeName(name);
    if (key && !display.has(key)) display.set(key, name.trim());
    return key;
  };

  const valid = expenses.filter((e) => toCents(e.amount) > 0 && normalizeName(e.paidBy));

  const defaultGroup = dedupNames([
    ...confirmed,
    // pagador sem RSVP também racha, salvo quando a despesa tem grupo próprio
    ...valid.filter((e) => !e.sharedWith.length).map((e) => e.paidBy),
  ]);

  const paidCents = new Map<string, number>();
  const owedCents = new Map<string, number>();
  let totalCents = 0;

  for (const expense of valid) {
    const cents = toCents(expense.amount);
    const payerKey = remember(expense.paidBy);
    totalCents += cents;
    paidCents.set(payerKey, (paidCents.get(payerKey) ?? 0) + cents);

    const people = dedupNames(expense.sharedWith.length ? expense.sharedWith : defaultGroup);
    if (!people.length) {
      // ninguém pra ratear: quem pagou arca sozinho
      owedCents.set(payerKey, (owedCents.get(payerKey) ?? 0) + cents);
      continue;
    }
    const shares = splitCents(cents, people.length);
    people.forEach((name, i) => {
      const key = remember(name);
      owedCents.set(key, (owedCents.get(key) ?? 0) + shares[i]);
    });
  }

  const keys = new Set([...paidCents.keys(), ...owedCents.keys()]);
  const balances: PersonBalance[] = [...keys]
    .map((key) => {
      const paid = paidCents.get(key) ?? 0;
      const owes = owedCents.get(key) ?? 0;
      return {
        name: display.get(key) ?? key,
        paid: toReais(paid),
        owes: toReais(owes),
        balance: toReais(paid - owes),
      };
    })
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'pt-BR'));

  return {
    total: toReais(totalCents),
    perHead: keys.size ? toReais(Math.round(totalCents / keys.size)) : 0,
    balances,
    transfers: settleTransfers(balances),
  };
}

/**
 * Fecha as contas com poucas transferências: casa sempre quem mais deve com
 * quem mais tem a receber. É a heurística gulosa padrão — o mínimo exato de
 * transferências é NP-difícil e não compensa aqui.
 */
function settleTransfers(balances: PersonBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => toCents(b.balance) > 0)
    .map((b) => ({ name: b.name, cents: toCents(b.balance) }));
  const debtors = balances
    .filter((b) => toCents(b.balance) < 0)
    .map((b) => ({ name: b.name, cents: -toCents(b.balance) }));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].cents, debtors[di].cents);
    transfers.push({ from: debtors[di].name, to: creditors[ci].name, amount: toReais(amount) });
    creditors[ci].cents -= amount;
    debtors[di].cents -= amount;
    if (creditors[ci].cents === 0) ci += 1;
    if (debtors[di].cents === 0) di += 1;
  }
  return transfers;
}

/** O que uma pessoa específica tem a pagar e a receber — resumo do convidado. */
export function summaryFor(name: string, settlement: Settlement): {
  balance: PersonBalance | null;
  pay: Transfer[];
  receive: Transfer[];
} {
  const key = normalizeName(name);
  if (!key) return { balance: null, pay: [], receive: [] };
  return {
    balance: settlement.balances.find((b) => normalizeName(b.name) === key) ?? null,
    pay: settlement.transfers.filter((t) => normalizeName(t.from) === key),
    receive: settlement.transfers.filter((t) => normalizeName(t.to) === key),
  };
}
