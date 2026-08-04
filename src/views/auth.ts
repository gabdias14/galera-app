import { state } from '../state';
import { escapeHtml } from '../lib/format';
import { logoHtml } from './components';

/**
 * Tela de acesso — **opcional por desenho**.
 *
 * Convidado nunca passa por aqui: abrir um convite e responder continua sendo
 * um clique, sem cadastro, porque é isso que faz o link circular no WhatsApp
 * (ver README, "o link é a chave"). Identificar-se serve a quem organiza, e
 * resolve duas coisas concretas:
 *
 * 1. recuperar os rolês em outro aparelho — hoje, sem isso, limpar o
 *    navegador apaga tudo o que a pessoa criou;
 * 2. carregar a assinatura do Galera Pro entre aparelhos.
 */
export function renderEntrar(): string {
  const { session } = state;

  if (state.authSent) {
    return (
      shell() +
      '<div class="panel auth-panel">' +
      '<div class="auth-panel__icon">📬</div>' +
      '<h2 style="margin-bottom:8px;">Link enviado</h2>' +
      `<p style="color:var(--ink-muted); line-height:1.6;">Abra o e-mail que mandamos pra <strong>${escapeHtml(state.authEmail)}</strong> e toque no link pra entrar. Pode fechar esta aba.</p>` +
      '<button class="link-btn" style="margin-top:18px;" data-action="auth-reset">Usar outro e-mail</button>' +
      '</div>'
    );
  }

  if (session.identified) {
    return (
      shell() +
      '<div class="panel auth-panel">' +
      '<div class="auth-panel__icon">✅</div>' +
      '<h2 style="margin-bottom:8px;">Você está conectado</h2>' +
      `<p style="color:var(--ink-muted); line-height:1.6;">Seus rolês estão salvos na conta <strong>${escapeHtml(session.email ?? '')}</strong> e abrem em qualquer aparelho.</p>` +
      '<button class="pro-btn" style="margin-top:20px;" data-action="sign-out">Sair desta conta</button>' +
      '</div>'
    );
  }

  return (
    shell() +
    '<div class="panel auth-panel">' +
    '<h2 style="margin-bottom:8px;">Salve seus rolês</h2>' +
    '<p style="color:var(--ink-muted); line-height:1.6; margin-bottom:20px;">' +
    'Sem senha: a gente manda um link por e-mail e pronto. Serve pra abrir seus rolês em outro ' +
    'aparelho e pra levar a assinatura do Pro junto.' +
    '</p>' +
    (state.error ? `<div class="error-note" style="margin-bottom:14px;">${escapeHtml(state.error)}</div>` : '') +
    '<form id="authForm">' +
    '<div class="field"><label for="authEmail">Seu e-mail</label>' +
    `<input type="email" id="authEmail" placeholder="voce@email.com" autocomplete="email" required value="${escapeHtml(state.authEmail)}"></div>` +
    '<button type="submit" class="submit-btn">Receber link de acesso</button>' +
    '</form>' +
    '<p class="auth-panel__fineprint">' +
    'Quem só vai <strong>responder a um convite</strong> não precisa de conta — é só abrir o link que te mandaram.' +
    '</p>' +
    '</div>'
  );
}

function shell(): string {
  return (
    '<div class="topbar">' +
    logoHtml() +
    '<button class="back-btn" data-action="go-home">← voltar</button>' +
    '</div>' +
    '<div class="hero__eyebrow">Sua conta</div>'
  );
}
