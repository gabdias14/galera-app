import { state } from '../state';
import { escapeHtml } from '../lib/format';

/**
 * Política de privacidade + exclusão de dados (LGPD art. 18). Sem cadastro,
 * "quem sou eu" é resolvido pelos tokens de RSVP guardados neste aparelho
 * (ver src/data/identity.ts) — por isso o botão de apagar só existe aqui,
 * não numa conta que não existe.
 */
export function renderPrivacidade(): string {
  return (
    '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
    '<div class="hero__eyebrow">Privacidade</div>' +
    '<h1 style="font-size:clamp(1.7rem,5vw,2.3rem); margin:8px 0 26px;">O que o Galera guarda sobre você</h1>' +
    '<div class="panel" style="max-width:680px; line-height:1.6;">' +
    '<h3 style="margin-bottom:8px;">O que coletamos</h3>' +
    '<p style="margin-bottom:16px; color:var(--ink-muted);">' +
    'O nome que você digita ao responder um convite; o telefone e a autorização de WhatsApp, ' +
    'só se você marcar a caixinha de lembrete; fotos que você sobe no álbum de um rolê; e, se o ' +
    'organizador usa o Galera Pro, o check-in e o valor cobrado na portaria.' +
    '</p>' +
    '<h3 style="margin-bottom:8px;">Quem vê o quê</h3>' +
    '<p style="margin-bottom:16px; color:var(--ink-muted);">' +
    'Seu nome e resposta (vou/talvez/não) aparecem pra quem tem o link do convite — é assim que a lista ' +
    'de confirmados funciona. Telefone, consentimento de WhatsApp e dados de check-in só o anfitrião ' +
    'do rolê enxerga.' +
    '</p>' +
    '<h3 style="margin-bottom:8px;">WhatsApp</h3>' +
    '<p style="margin-bottom:16px; color:var(--ink-muted);">' +
    'Só mandamos mensagem pra quem marcou a caixinha de autorização no RSVP. Toda mensagem enviada ' +
    'traz a instrução de como parar de receber.' +
    '</p>' +
    '<h3 style="margin-bottom:8px;">Apagar seus dados</h3>' +
    '<p style="margin-bottom:16px; color:var(--ink-muted);">' +
    'Sem cadastro, este aparelho lembra em quais rolês você já respondeu. O botão abaixo apaga sua ' +
    'resposta, telefone e votos de todos eles.' +
    '</p>' +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    '<button class="pro-btn" style="background:var(--coral); color:#fff;" data-action="forget-everything">' +
    'Apagar meus dados de todos os rolês' +
    '</button>' +
    '</div>'
  );
}
