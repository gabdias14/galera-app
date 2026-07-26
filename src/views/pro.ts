import type { EventRecord, OutboxMessage } from '../types';
import { state } from '../state';
import { escapeHtml, initials, plural } from '../lib/format';
import { formatPhoneBR } from '../lib/phone';
import { formatMoney, formatMoneyShort } from '../lib/messages';
import { longDate, relativeDays } from '../lib/date';
import {
  TIER_COLORS,
  TIER_LABELS,
  type Tier,
  eventRevenue,
  filterAudience,
  isPastEvent,
  projectAudience,
  promoterStats,
} from '../lib/audience';
import { logoHtml, recapModalHtml } from './components';

const ALL_TIERS: Tier[] = ['vip', 'fiel', 'promissor', 'risco', 'dormente'];

function tierBadge(tier: Tier): string {
  return `<span class="tier-badge" style="background:${TIER_COLORS[tier]}">${TIER_LABELS[tier]}</span>`;
}

function topbar(): string {
  const org = state.orgs.find((o) => o.id === state.orgId);
  return (
    '<div class="topbar">' +
    logoHtml() +
    '<button class="pro-switch" data-action="go-home">🎈 Modo pessoal</button>' +
    '</div>' +
    '<div class="hero__eyebrow">Galera Pro</div>' +
    `<h1 style="font-size:clamp(1.6rem,4.5vw,2.2rem); margin:8px 0 6px;">${escapeHtml(org?.name ?? 'Sua produtora')}</h1>` +
    '<p style="color:var(--muted); margin-bottom:22px; max-width:52ch;">Sua base de público, seus promoters e a portaria — no mesmo lugar em que o convite é criado.</p>'
  );
}

function tabs(): string {
  const tab = (id: string, label: string) =>
    `<button class="tab-btn${state.proTab === id ? ' is-active' : ''}" data-action="pro-tab" data-tab="${id}">${label}</button>`;
  return (
    '<div class="tabs">' +
    tab('painel', 'Painel') +
    tab('publico', `Público (${state.audience.length})`) +
    tab('promoters', `Promoters (${state.promoters.length})`) +
    '</div>'
  );
}

/* ===================== painel ===================== */

function renderPainel(): string {
  const events = state.orgEvents;
  const past = events.filter((e) => isPastEvent(e));
  const upcoming = events.filter((e) => !isPastEvent(e));
  const revenue = past.reduce((s, e) => s + eventRevenue(e), 0);
  const attendance = past.reduce((s, e) => s + e.guests.filter((g) => g.checkedInAt).length, 0);
  const confirmed = past.reduce((s, e) => s + e.guests.filter((g) => g.status === 'vou').length, 0);
  const showRate = confirmed > 0 ? Math.round((attendance / confirmed) * 100) : 0;
  const optIn = state.audience.filter((c) => c.waOptIn && c.phone).length;

  const eventRow = (ev: EventRecord) => {
    const present = ev.guests.filter((g) => g.checkedInAt).length;
    const yes = ev.guests.filter((g) => g.status === 'vou').length;
    const past_ = isPastEvent(ev);
    return (
      '<div class="link-row">' +
      `<div style="font-size:1.5rem">${ev.emoji}</div>` +
      '<div style="flex:1; min-width:160px;">' +
      `<div style="font-weight:700; font-size:.95rem;">${escapeHtml(ev.title)}</div>` +
      `<div class="link-meta">${longDate(ev.date)} · ${past_ ? `${present} presenças · ${formatMoneyShort(eventRevenue(ev))}` : `${yes} confirmados · ${relativeDays(ev.date)}`}</div>` +
      '</div>' +
      '<div class="link-actions">' +
      `<button data-action="open-event" data-id="${ev.id}">Abrir</button>` +
      `<button data-action="open-door" data-id="${ev.id}">Portaria</button>` +
      '</div></div>'
    );
  };

  return (
    '<div class="kpi-grid">' +
    `<div class="kpi"><b>${state.audience.length}</b><span>pessoas na base</span><small>${optIn} liberaram WhatsApp</small></div>` +
    `<div class="kpi"><b>${formatMoneyShort(revenue)}</b><span>receita registrada</span><small>${past.length} ${plural(past.length, 'edição', 'edições')} realizadas</small></div>` +
    `<div class="kpi"><b>${showRate}%</b><span>taxa de presença</span><small>${attendance} de ${confirmed} confirmados</small></div>` +
    `<div class="kpi"><b>${state.audience.filter((c) => c.tier === 'vip').length}</b><span>VIPs</span><small>maior receita por cabeça</small></div>` +
    '</div>' +
    (upcoming.length
      ? `<div class="section-label">Próximos</div>${upcoming.map(eventRow).join('')}`
      : '<div class="empty-note">Nenhuma edição futura. Crie uma pra poder chamar a audiência.</div>') +
    `<div class="section-label">Histórico</div>` +
    (past.length
      ? past.map(eventRow).join('') +
        '<button class="pro-btn pro-btn--go" style="margin-top:6px;" data-action="open-season-recap">✨ Gerar recap da temporada</button>'
      : '<div class="empty-note">Sem edições passadas ainda.</div>')
  );
}

/* ===================== público ===================== */

function campaignPanel(): string {
  const upcoming = state.orgEvents.filter((e) => !isPastEvent(e));
  if (!upcoming.length) {
    return (
      '<div class="pro-panel">' +
      '<h3>Chamar a galera</h3>' +
      '<div class="helptext">Crie uma edição futura pra poder disparar a campanha.</div>' +
      '</div>'
    );
  }

  const target = upcoming.find((e) => e.id === state.campaignEventId) ?? upcoming[0];
  const selected = filterAudience(state.audience, { ...state.audienceFilter, onlyOptIn: true });
  const projection = projectAudience(selected, target.ticketPrice);
  const semOptIn = filterAudience(state.audience, state.audienceFilter).length - selected.length;

  const options = upcoming
    .map(
      (e) =>
        `<option value="${e.id}"${e.id === target.id ? ' selected' : ''}>${escapeHtml(e.emoji + ' ' + e.title)}</option>`,
    )
    .join('');
  const promoterOptions =
    '<option value="">Lista da casa</option>' +
    state.promoters
      .filter((p) => p.active)
      .map(
        (p) =>
          `<option value="${p.id}"${p.id === state.campaignPromoterId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`,
      )
      .join('');

  return (
    '<div class="pro-panel">' +
    '<h3>Chamar a galera ✨</h3>' +
    '<div class="helptext">Gera um link rastreável e uma mensagem personalizada pra cada pessoa do filtro — ' +
    'só pra quem autorizou WhatsApp.</div>' +
    '<div class="pro-form-row">' +
    `<div class="pro-field"><label>Para qual rolê</label><select class="pro-input" id="campaignEvent">${options}</select></div>` +
    `<div class="pro-field"><label>Creditar a</label><select class="pro-input" id="campaignPromoter">${promoterOptions}</select></div>` +
    '</div>' +
    '<div class="projection">' +
    `<div><b>${projection.people}</b><span>convites</span></div>` +
    `<div><b>${projection.expectedAttendance}</b><span>presenças previstas</span></div>` +
    `<div><b>${formatMoneyShort(projection.expectedRevenue)}</b><span>receita prevista</span></div>` +
    '</div>' +
    (semOptIn > 0
      ? `<div class="helptext">⚠️ ${semOptIn} ${plural(semOptIn, 'pessoa')} no filtro ${semOptIn === 1 ? 'ficou' : 'ficaram'} de fora por não ${semOptIn === 1 ? 'ter' : 'terem'} autorizado WhatsApp. Use o link público pra alcançar essa turma.</div>`
      : '') +
    `<button class="pro-btn pro-btn--go" data-action="build-campaign" data-id="${target.id}"${projection.people ? '' : ' disabled'}>` +
    `Montar campanha para ${projection.people} ${plural(projection.people, 'pessoa')}</button>` +
    '</div>' +
    queuePanel(target)
  );
}

function queuePanel(target: EventRecord): string {
  const queue = state.outbox.filter((m) => m.kind === 'campanha');
  if (!queue.length) return '';
  const pending = queue.filter((m) => m.status === 'pendente');
  const preview = pending[0] ?? queue[0];

  return (
    '<div class="pro-panel">' +
    `<h3>Fila de envio — ${escapeHtml(target.title)}</h3>` +
    `<div class="helptext">${pending.length} ${plural(pending.length, 'mensagem', 'mensagens')} ${plural(pending.length, 'pendente', 'pendentes')} de ${queue.length}. ` +
    'Cada envio abre o WhatsApp com o texto pronto — você confere e manda.</div>' +
    `<div class="msg-preview">${escapeHtml(preview.text)}</div>` +
    '<div class="pro-form-row" style="margin-bottom:14px;">' +
    `<button class="pro-btn pro-btn--go" data-action="send-next"${pending.length ? '' : ' disabled'}>📲 Enviar próxima (${pending.length})</button>` +
    '<button class="pro-btn pro-btn--ghost" data-action="export-campaign">⬇️ Exportar CSV</button>' +
    '<button class="pro-btn pro-btn--ghost" data-action="clear-campaign">Limpar fila</button>' +
    '</div>' +
    queue.slice(0, 40).map(queueItem).join('') +
    (queue.length > 40 ? `<div class="empty-note">+${queue.length - 40} na fila</div>` : '')
  );
}

function queueItem(m: OutboxMessage): string {
  return (
    `<div class="queue-item${m.status === 'enviado' ? ' is-sent' : ''}">` +
    '<div class="queue-item__main">' +
    `<div class="queue-item__name">${escapeHtml(m.toName)}</div>` +
    `<div class="queue-item__phone">${escapeHtml(formatPhoneBR(m.toPhone))}</div>` +
    '</div>' +
    (m.status === 'enviado'
      ? '<span class="link-meta">✓ enviado</span>'
      : `<button class="pro-btn" data-action="send-message" data-id="${m.id}">Enviar</button>`) +
    '</div>'
  );
}

function renderPublico(): string {
  const filter = state.audienceFilter;
  const chips = ALL_TIERS.map((t) => {
    const on = filter.tiers?.includes(t);
    const count = state.audience.filter((c) => c.tier === t).length;
    return `<button class="tier-chip${on ? ' is-on' : ''}" data-action="toggle-tier" data-tier="${t}">${TIER_LABELS[t]} (${count})</button>`;
  }).join('');

  const list = filterAudience(state.audience, filter);
  const rows = list
    .slice(0, 60)
    .map((c) => {
      const reachable = c.waOptIn && c.phone;
      return (
        '<div class="contact-row">' +
        `<div class="avatar" style="background:${TIER_COLORS[c.tier]}; color:#1B1030">${initials(c.name)}</div>` +
        '<div class="contact-main">' +
        `<div class="contact-name">${escapeHtml(c.name)} ${tierBadge(c.tier)}` +
        (reachable ? '' : '<span class="no-optin">sem WhatsApp</span>') +
        '</div>' +
        `<div class="contact-reasons">${escapeHtml(c.reasons.join(' · '))}</div>` +
        '</div>' +
        `<div class="contact-score">${c.score}<small>SCORE</small></div>` +
        '</div>'
      );
    })
    .join('');

  const dormantes = state.audience.filter((c) => c.tier === 'dormente' || c.tier === 'risco').length;

  return (
    '<div class="pro-panel">' +
    '<h3>Quem chamar</h3>' +
    '<div class="helptext">Score de 0 a 100 combinando receita, frequência, comparecimento, recência e quantas pessoas a ' +
    'pessoa trouxe. Tudo vem dos seus próprios rolês.</div>' +
    `<div class="picker-row" style="margin-bottom:14px;">${chips}</div>` +
    '<div class="pro-form-row">' +
    `<div class="pro-field"><label>Buscar</label><input class="pro-input" id="audienceSearch" placeholder="nome" value="${escapeHtml(filter.search ?? '')}"></div>` +
    `<div class="pro-field"><label>Quantas pessoas</label><input class="pro-input" id="audienceSize" type="number" min="1" max="500" value="${filter.size ?? 50}"></div>` +
    '</div>' +
    (dormantes > 0
      ? '<div class="pro-form-row" style="margin-top:4px;">' +
        `<button class="pro-btn" data-action="suggest-winback">🔔 Sugestão de resgate (${dormantes} sumidos/em risco)</button>` +
        '<button class="pro-btn pro-btn--ghost" data-action="export-audience">⬇️ Exportar CSV</button>' +
        '</div>'
      : '<div class="pro-form-row" style="margin-top:4px;">' +
        '<button class="pro-btn pro-btn--ghost" data-action="export-audience">⬇️ Exportar CSV</button>' +
        '</div>') +
    '</div>' +
    campaignPanel() +
    `<div class="section-label">${list.length} ${plural(list.length, 'pessoa')} no filtro</div>` +
    (rows || '<div class="empty-note">Ninguém bate com esse filtro.</div>') +
    (list.length > 60 ? `<div class="empty-note">+${list.length - 60} pessoas</div>` : '')
  );
}

/* ===================== promoters ===================== */

function renderPromoters(): string {
  const stats = promoterStats(state.orgEvents, state.promoters);
  const rows = stats
    .map(
      (s) =>
        '<div class="link-row">' +
        `<div class="avatar" style="background:var(--purple)">${initials(s.promoter.name)}</div>` +
        '<div style="flex:1; min-width:170px;">' +
        `<div style="font-weight:700;">${escapeHtml(s.promoter.name)}${s.promoter.active ? '' : ' <span class="link-meta">(inativo)</span>'}</div>` +
        `<div class="link-meta">${s.links} ${plural(s.links, 'link')} · ${s.opens} aberturas · ${s.confirmed} confirmados · ${s.attended} presenças</div>` +
        `<div class="link-meta">Conversão ${Math.round(s.conversion * 100)}% · Receita ${formatMoneyShort(s.revenue)} · Comissão ${s.promoter.commissionPct}% = <strong>R$ ${formatMoney(s.commission)}</strong></div>` +
        '</div>' +
        '<div class="link-actions">' +
        `<button data-action="copy-promoter-link" data-token="${s.promoter.publicToken}">Copiar link do promoter</button>` +
        `<button data-action="toggle-promoter" data-id="${s.promoter.id}">${s.promoter.active ? 'Desativar' : 'Reativar'}</button>` +
        '</div></div>',
    )
    .join('');

  return (
    '<div class="pro-panel">' +
    '<h3>Novo promoter</h3>' +
    '<div class="helptext">Cada promoter ganha links próprios por rolê — é o link que credita a venda e calcula a comissão. ' +
    'Manda também o "link do promoter": ele vê os números dele, sem precisar de login.</div>' +
    '<form class="pro-form-row" id="promoterForm">' +
    '<div class="pro-field"><label>Nome</label><input class="pro-input" id="promoterName" placeholder="Nome do promoter" required></div>' +
    '<div class="pro-field"><label>WhatsApp</label><input class="pro-input" id="promoterPhone" placeholder="(11) 99999-0000"></div>' +
    '<div class="pro-field" style="max-width:130px;"><label>Comissão %</label><input class="pro-input" id="promoterCommission" type="number" min="0" max="100" step="0.5" value="10"></div>' +
    '<button class="pro-btn pro-btn--go" type="submit">Adicionar</button>' +
    '</form>' +
    '</div>' +
    (rows || '<div class="empty-note">Nenhum promoter ainda.</div>')
  );
}

/* ===================== dispatcher ===================== */

export function renderPro(): string {
  if (state.loading) return '<div class="loading-note">Carregando sua operação...</div>';

  if (!state.orgs.length) {
    return (
      topbar() +
      '<div class="pro-panel">' +
      '<h3>Criar sua produtora</h3>' +
      '<div class="helptext">A produtora agrupa seus rolês, seu público e seus promoters.</div>' +
      '<form class="pro-form-row" id="orgForm">' +
      '<div class="pro-field"><label>Nome</label><input class="pro-input" id="orgName" placeholder="Ex: Aurora Produções" required></div>' +
      '<button class="pro-btn pro-btn--go" type="submit">Criar</button>' +
      '</form></div>'
    );
  }

  const body =
    state.proTab === 'painel'
      ? renderPainel()
      : state.proTab === 'publico'
        ? renderPublico()
        : renderPromoters();

  return (
    topbar() +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    tabs() +
    body +
    recapModalHtml()
  );
}
