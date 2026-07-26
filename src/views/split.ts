import type { EventRecord } from '../types';
import { state } from '../state';
import { escapeHtml, plural } from '../lib/format';
import { formatMoney } from '../lib/messages';
import { settle, summaryFor, type Settlement } from '../lib/split';

/** Nomes que entram no rateio por padrão: quem confirmou presença. */
export function confirmedNames(ev: EventRecord): string[] {
  return ev.guests.filter((g) => g.status === 'vou').map((g) => g.name);
}

export function settlementFor(ev: EventRecord): Settlement {
  return settle(ev.expenses, confirmedNames(ev));
}

function money(v: number): string {
  return `R$ ${formatMoney(v)}`;
}

function expenseRowHtml(ev: EventRecord, x: EventRecord['expenses'][number]): string {
  const quem = x.sharedWith.length
    ? `${x.sharedWith.length} ${plural(x.sharedWith.length, 'pessoa')}`
    : 'todo mundo';
  // `guestMode` é o anfitrião espiando a visão do convidado: ali não cabe ação de dono.
  // Esta seção vive sobre o fundo vermelho — um link em coral-dark some nele.
  const apagar =
    ev.isHost && !state.guestMode
      ? `<button class="expense-row__del" data-action="delete-expense" data-id="${x.id}" aria-label="Apagar ${escapeHtml(x.description)}">apagar</button>`
      : '';
  return (
    '<div class="expense-row">' +
    '<div style="flex:1; min-width:0;">' +
    `<div class="expense-row__desc">${escapeHtml(x.description)}</div>` +
    `<div class="expense-row__meta">${escapeHtml(x.paidBy)} pagou · racha com ${quem}</div>` +
    '</div>' +
    `<div class="expense-row__amount">${money(x.amount)}</div>` +
    apagar +
    '</div>'
  );
}

/** Formulário de lançamento — aberto pra qualquer um, porque quem comprou é quem sabe o valor. */
function expenseFormHtml(ev: EventRecord): string {
  const nomes = confirmedNames(ev);
  const datalist = nomes.length
    ? `<datalist id="expensePayers">${nomes.map((n) => `<option value="${escapeHtml(n)}"></option>`).join('')}</datalist>`
    : '';
  return (
    '<form class="expense-form" id="expenseForm">' +
    '<input type="text" id="expenseDesc" placeholder="O que foi? Ex: Carne, gelo, cerveja" maxlength="80" required>' +
    '<div class="expense-form__row">' +
    '<input type="number" id="expenseAmount" placeholder="0,00" min="0.01" step="0.01" inputmode="decimal" required>' +
    `<input type="text" id="expensePaidBy" list="expensePayers" placeholder="Quem pagou" maxlength="60" value="${escapeHtml(state.myName)}" required>` +
    '</div>' +
    datalist +
    '<button type="submit" class="submit-btn" style="margin-top:4px;">Lançar despesa</button>' +
    '</form>'
  );
}

function balancesHtml(s: Settlement): string {
  if (!s.balances.length) return '';
  const rows = s.balances
    .map((b) => {
      const cents = Math.round(b.balance * 100);
      const tag =
        cents > 0
          ? `<span class="balance-tag balance-tag--up">recebe ${money(b.balance)}</span>`
          : cents < 0
            ? `<span class="balance-tag balance-tag--down">deve ${money(-b.balance)}</span>`
            : '<span class="balance-tag">quite</span>';
      return (
        '<div class="balance-row">' +
        `<div class="balance-row__name">${escapeHtml(b.name)}</div>` +
        `<div class="balance-row__paid">pagou ${money(b.paid)}</div>` +
        tag +
        '</div>'
      );
    })
    .join('');
  return `<div class="section-label">Saldo de cada um</div><div class="balance-list">${rows}</div>`;
}

function transfersHtml(ev: EventRecord, s: Settlement): string {
  if (!s.transfers.length) {
    return s.total > 0
      ? '<div class="empty-note">Todo mundo quite — ninguém deve nada. 🎉</div>'
      : '';
  }
  const pixHint = ev.pix
    ? `<div class="empty-note" style="margin-top:10px;">PIX do rolê: <strong>${escapeHtml(ev.pix)}</strong></div>`
    : '';
  const rows = s.transfers
    .map(
      (t) =>
        '<div class="transfer-row">' +
        `<span>${escapeHtml(t.from)}</span>` +
        '<span class="transfer-row__arrow">→</span>' +
        `<span>${escapeHtml(t.to)}</span>` +
        `<strong>${money(t.amount)}</strong>` +
        '</div>',
    )
    .join('');
  return (
    '<div class="section-label">Como acertar</div>' +
    `<div class="transfer-list">${rows}</div>` +
    pixHint
  );
}

/** "Você deve R$ X pro Fulano" — o que a pessoa quer saber ao abrir a aba. */
function myPositionHtml(s: Settlement): string {
  if (!state.myName) return '';
  const mine = summaryFor(state.myName, s);
  if (!mine.balance) return '';
  const cents = Math.round(mine.balance.balance * 100);
  if (cents === 0) return '<div class="my-position my-position--even">Você está quite. 🎉</div>';
  if (cents < 0) {
    const linhas = mine.pay
      .map((t) => `<div>Pague <strong>${money(t.amount)}</strong> pro ${escapeHtml(t.to)}</div>`)
      .join('');
    return `<div class="my-position my-position--down"><div class="my-position__lead">Você deve ${money(-mine.balance.balance)}</div>${linhas}</div>`;
  }
  const linhas = mine.receive
    .map((t) => `<div>${escapeHtml(t.from)} te deve <strong>${money(t.amount)}</strong></div>`)
    .join('');
  return `<div class="my-position my-position--up"><div class="my-position__lead">Você tem ${money(mine.balance.balance)} a receber</div>${linhas}</div>`;
}

export function splitSectionHtml(ev: EventRecord): string {
  const s = settlementFor(ev);
  const resumo = ev.expenses.length
    ? '<div class="stat-row">' +
      `<div class="stat-chip"><b>${money(s.total)}</b><span>gasto total</span></div>` +
      `<div class="stat-chip"><b>${money(s.perHead)}</b><span>por pessoa</span></div>` +
      `<div class="stat-chip"><b>${ev.expenses.length}</b><span>${plural(ev.expenses.length, 'despesa')}</span></div>` +
      '</div>'
    : '';

  const lista = ev.expenses.length
    ? `<div class="section-label">Despesas</div><div class="expense-list">${ev.expenses.map((x) => expenseRowHtml(ev, x)).join('')}</div>`
    : '<div class="empty-note">Ninguém lançou nada ainda. Quem comprou alguma coisa pro rolê, lança aí — o app divide sozinho.</div>';

  return (
    myPositionHtml(s) +
    resumo +
    expenseFormHtml(ev) +
    lista +
    balancesHtml(s) +
    transfersHtml(ev, s)
  );
}
