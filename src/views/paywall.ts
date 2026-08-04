import type { Org } from '../types';
import { escapeHtml } from '../lib/format';
import { FEATURE_PITCH, PLAN_LABEL, checkoutUrl, isPro, type ProFeature } from '../lib/plan';

const FEATURE_TITLE: Record<ProFeature, string> = {
  campanha: 'Campanha para o próximo rolê',
  promoters: 'Promoters e comissão',
  portaria: 'Portaria e check-in',
  exportar: 'Exportar a base',
};

/**
 * Bloqueio de recurso pago.
 *
 * O botão **abre o navegador**, não um checkout embutido: cobrar dentro do app
 * Android/iOS acionaria a comissão de 15–30% da loja, e o plano de negócio
 * depende de não pagar isso (`docs/business-plan.md` §6).
 */
export function paywallHtml(org: Org | null | undefined, feature: ProFeature): string {
  return (
    '<div class="paywall">' +
    '<div class="paywall__badge">Galera Pro</div>' +
    `<h3 class="paywall__title">${FEATURE_TITLE[feature]}</h3>` +
    `<p class="paywall__pitch">${FEATURE_PITCH[feature]}</p>` +
    `<a class="paywall__cta" href="${escapeHtml(checkoutUrl(org))}" target="_blank" rel="noopener noreferrer">` +
    'Ver planos' +
    '</a>' +
    '<p class="paywall__note">A assinatura é feita no site, no navegador.</p>' +
    '</div>'
  );
}

/** Selo do plano atual, no topo da área Pro. */
export function planBadgeHtml(org: Org | null | undefined): string {
  const pro = isPro(org);
  const plan = org?.plan ?? 'free';
  return (
    `<span class="plan-badge plan-badge--${plan}">${PLAN_LABEL[plan]}</span>` +
    (pro
      ? ''
      : `<a class="plan-badge__upgrade" href="${escapeHtml(checkoutUrl(org))}" target="_blank" rel="noopener noreferrer">assinar o Pro</a>`)
  );
}
