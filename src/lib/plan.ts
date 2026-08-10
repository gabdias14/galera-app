import type { Org, Plan } from '../types';

/**
 * O que cada plano libera no Galera Pro.
 *
 * O lado B2C é grátis pra sempre e não passa por aqui — é o canal de aquisição
 * (`docs/business-plan.md` §6). Este arquivo governa só a camada da produtora.
 *
 * A régua escolhida: **no grátis a produtora vê o valor, no Pro ela age.** O
 * painel e o score de público ficam abertos porque são o argumento de venda —
 * a pessoa precisa olhar a própria base pontuada pra entender o que está
 * comprando. Disparar campanha, gerenciar promoter, rodar a portaria e
 * exportar a base são o trabalho que a assinatura paga.
 *
 * **É aqui que se mexe pra mudar a régua comercial** — nenhuma outra parte do
 * código decide isso.
 */
export type ProFeature = 'campanha' | 'promoters' | 'portaria' | 'exportar';

const PRO_ONLY: Record<ProFeature, true> = {
  campanha: true,
  promoters: true,
  portaria: true,
  exportar: true,
};

/** Quantos rolês o plano grátis aguenta antes de pedir assinatura. */
export const FREE_EVENT_LIMIT = 3;

export function isPro(org: Org | null | undefined): boolean {
  return org?.plan === 'pro';
}

/** A produtora pode usar este recurso? */
export function can(org: Org | null | undefined, feature: ProFeature): boolean {
  if (!PRO_ONLY[feature]) return true;
  return isPro(org);
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Grátis',
  pro: 'Pro',
};

/** Por que vale assinar — o texto que aparece no bloqueio de cada recurso. */
export const FEATURE_PITCH: Record<ProFeature, string> = {
  campanha:
    'Chame de volta quem já foi, com link rastreável e projeção de presença por pessoa — não um disparo pra "todo mundo".',
  promoters:
    'Cadastre promoters, dê a cada um o próprio link e acompanhe comissão por presença confirmada.',
  portaria:
    'Check-in na porta com busca, QR e registro de quanto cada pessoa gastou — funciona mesmo sem sinal.',
  exportar: 'Leve sua base de público pra qualquer outra ferramenta, em CSV.',
};

/**
 * Onde a assinatura é vendida. Fica **fora** do app de propósito: cobrar
 * dentro do app Android/iOS acionaria a comissão de 15–30% da loja
 * (`docs/business-plan.md` §6). O botão de assinar abre o navegador.
 */
export function checkoutUrl(org: Org | null | undefined): string {
  const base = import.meta.env.VITE_PUBLIC_URL || 'https://galera.app';
  const ref = org ? `?org=${encodeURIComponent(org.id)}` : '';
  return `${base.replace(/\/$/, '')}/assinar${ref}`;
}
