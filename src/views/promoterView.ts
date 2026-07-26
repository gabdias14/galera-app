import { state } from '../state';
import { escapeHtml, plural } from '../lib/format';
import { formatMoney, formatMoneyShort } from '../lib/messages';

/**
 * Painel público do promoter — `#/promoter/<publicToken>`. Mesmo padrão de
 * "token secreto na URL" do link de convite (docs/melhorias.md #14): a
 * produtora manda o link, o promoter vê só o desempenho dele, sem login.
 */
export function renderPromoterView(): string {
  if (state.loading) return '<div class="loading-note">Carregando seus números...</div>';

  const view = state.promoterView;
  if (!view) {
    return (
      '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
      '<div class="hero__eyebrow">Painel do promoter</div>' +
      '<h1 style="font-size:clamp(1.4rem,4vw,1.9rem); margin:8px 0 4px;">Link inválido</h1>' +
      '<p style="color:var(--muted);">Esse link não corresponde a nenhum promoter ativo. Peça um novo link pra produtora.</p>'
    );
  }

  return (
    '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
    '<div class="hero__eyebrow">Painel do promoter</div>' +
    `<h1 style="font-size:clamp(1.4rem,4vw,1.9rem); margin:8px 0 4px;">${escapeHtml(view.name)}</h1>` +
    `<p style="color:var(--muted); margin-bottom:18px;">Comissão de ${view.commissionPct}%${view.active ? '' : ' · inativo no momento'}</p>` +
    '<div class="kpi-grid" style="margin-bottom:14px;">' +
    `<div class="kpi"><b>${view.links}</b><span>${plural(view.links, 'link')}</span></div>` +
    `<div class="kpi"><b>${view.opens}</b><span>${plural(view.opens, 'abertura')}</span></div>` +
    `<div class="kpi"><b>${view.confirmed}</b><span>${plural(view.confirmed, 'confirmado')}</span></div>` +
    `<div class="kpi"><b>${view.attended}</b><span>${plural(view.attended, 'presença')}</span></div>` +
    '</div>' +
    '<div class="panel">' +
    `<div class="link-meta">Conversão ${Math.round(view.conversion * 100)}% (confirmados por abertura)</div>` +
    `<div style="margin-top:10px;"><b>Receita atribuída:</b> ${formatMoneyShort(view.revenue)}</div>` +
    `<div style="margin-top:6px;"><b>Sua comissão:</b> R$ ${formatMoney(view.commission)}</div>` +
    '</div>'
  );
}
