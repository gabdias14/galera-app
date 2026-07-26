import type { EventRecord } from '../types';
import { state } from '../state';
import { escapeHtml, initials, normalizeName, plural, sameName } from '../lib/format';
import { formatMoneyShort } from '../lib/messages';
import { doorStats } from '../lib/audience';
import { longDate } from '../lib/date';

const STATUS_LABEL: Record<string, string> = {
  vou: 'confirmou',
  talvez: 'talvez',
  nao: 'tinha dito que não vinha',
};

/**
 * Portaria: a tela que roda no celular de quem está na porta.
 * Busca rápida, botão grande e contador ao vivo — nada de scroll infinito.
 */
export function renderDoor(ev: EventRecord): string {
  const stats = doorStats(ev);
  const term = normalizeName(state.doorSearch);
  const linkLabel = new Map(ev.links.map((l) => [l.code, l.label]));

  const matches = ev.guests
    .filter((g) => !term || normalizeName(g.name).includes(term))
    .sort((a, b) => {
      // quem ainda não entrou primeiro; depois confirmados; depois alfabético
      if (!!a.checkedInAt !== !!b.checkedInAt) return a.checkedInAt ? 1 : -1;
      if ((a.status === 'vou') !== (b.status === 'vou')) return a.status === 'vou' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const exactMatch = state.doorSearch.trim()
    ? ev.guests.some((g) => sameName(g.name, state.doorSearch))
    : true;

  const rows = matches
    .slice(0, 60)
    .map((g) => {
      const origin = g.linkCode ? linkLabel.get(g.linkCode) : null;
      return (
        `<div class="door-row${g.checkedInAt ? ' is-in' : ''}">` +
        `<div class="avatar" style="background:${g.color}">${initials(g.name)}</div>` +
        '<div class="door-row__main">' +
        `<div class="door-row__name">${escapeHtml(g.name)}</div>` +
        `<div class="door-row__meta">${STATUS_LABEL[g.status]}${origin ? ` · via ${escapeHtml(origin)}` : ''}` +
        `${g.checkedInAt ? ` · entrou${g.amountPaid ? ` · R$ ${g.amountPaid}` : ''}` : ''}</div>` +
        '</div>' +
        (g.checkedInAt
          ? `<button class="door-btn door-btn--undo" data-action="undo-checkin" data-id="${g.id}">desfazer</button>`
          : `<button class="door-btn" data-action="checkin" data-id="${g.id}">Entrou ✓</button>`) +
        '</div>'
      );
    })
    .join('');

  const walkIn =
    state.doorSearch.trim() && !exactMatch
      ? `<button class="pro-btn pro-btn--go" style="width:100%; margin-bottom:14px;" data-action="walk-in">` +
        `+ Adicionar "${escapeHtml(state.doorSearch.trim())}" e dar entrada</button>`
      : '';

  const lotacao = stats.capacity
    ? `<div class="kpi"><b>${Math.round((stats.present / stats.capacity) * 100)}%</b><span>da lotação</span><small>limite ${stats.capacity}</small></div>`
    : '';

  return (
    '<div class="topbar">' +
    `<button class="back-btn" data-action="open-event" data-id="${ev.id}">← rolê</button>` +
    '<button class="pro-switch" data-action="go-pro">Galera Pro</button>' +
    '</div>' +
    '<div class="hero__eyebrow">Portaria</div>' +
    `<h1 style="font-size:clamp(1.4rem,4vw,1.9rem); margin:8px 0 4px;">${ev.emoji} ${escapeHtml(ev.title)}</h1>` +
    `<p style="color:var(--muted); margin-bottom:18px;">${longDate(ev.date)} · ${ev.time}</p>` +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    '<div class="door-bar">' +
    '<div class="kpi-grid" style="margin-bottom:14px;">' +
    `<div class="kpi"><b>${stats.present}</b><span>na casa</span><small>${stats.walkIns} sem confirmar antes</small></div>` +
    `<div class="kpi"><b>${stats.confirmed}</b><span>confirmados</span><small>${stats.confirmed - stats.present} ainda não chegaram</small></div>` +
    `<div class="kpi"><b>${formatMoneyShort(stats.revenue)}</b><span>na portaria</span><small>ingresso R$ ${ev.ticketPrice}</small></div>` +
    lotacao +
    '</div>' +
    '<div class="pro-form-row" style="margin-bottom:10px;">' +
    `<div class="pro-field" style="flex:2;"><label>Buscar convidado</label><input class="door-search" id="doorSearch" placeholder="Digite o nome..." value="${escapeHtml(state.doorSearch)}" autocomplete="off" style="margin-bottom:0;"></div>` +
    `<div class="pro-field" style="max-width:150px;"><label>Valor cobrado</label><input class="pro-input" id="doorAmount" type="number" min="0" step="5" value="${state.doorAmount ?? ev.ticketPrice}"></div>` +
    '</div>' +
    '</div>' +
    walkIn +
    (rows || '<div class="empty-note">Ninguém com esse nome na lista.</div>') +
    (matches.length > 60
      ? `<div class="empty-note">+${matches.length - 60} ${plural(matches.length - 60, 'convidado')} — refine a busca</div>`
      : '')
  );
}
