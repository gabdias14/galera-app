import { COLORS, state } from '../state';
import { escapeHtml, initials } from '../lib/format';
import { stubDate } from '../lib/date';
import { logoHtml } from './components';

export function renderHome(): string {
  const cards = state.events
    .map((ev, i) => {
      const tint = COLORS[ev.color].tint;
      const stub = stubDate(ev.date);
      const avatars = ev.guests
        .filter((g) => g.status === 'vou')
        .slice(0, 3)
        .map((g) => `<div class="mini-avatar" style="background:${g.color}">${initials(g.name)}</div>`)
        .join('');
      const tilt = [-2, 1.6, -1.1, 2.2][i % 4];
      return (
        `<button class="evcard" style="--tilt:${tilt}deg" data-action="open-event" data-id="${ev.id}">` +
        `<div class="evcard__top" style="--tint:${tint}">` +
        `<div class="evcard__emoji">${ev.emoji}</div>` +
        `<div class="evcard__date">${stub.wd} · ${stub.day} ${stub.mon}</div>` +
        `<div class="evcard__title">${escapeHtml(ev.title)}</div>` +
        '</div>' +
        '<div class="perf"></div>' +
        '<div class="evcard__bottom">' +
        `<div class="evcard__loc">${escapeHtml(ev.location)}</div>` +
        `<div class="mini-stack">${avatars}</div>` +
        '</div></button>'
      );
    })
    .join('');

  const board = state.loading
    ? '<div class="loading-note">Carregando seus rolês...</div>'
    : '<div class="board">' +
      cards +
      '<button class="evcard evcard--new" data-action="go-create">' +
      '<div class="evcard--new__plus">+</div>' +
      '<div>Criar novo rolê</div>' +
      '</button></div>';

  return (
    '<div class="topbar">' +
    logoHtml() +
    '<div style="display:flex; gap:10px; align-items:center;">' +
    '<button class="pro-switch" data-action="go-pro">📊 Galera Pro</button>' +
    '<button class="topbar__cta" data-action="go-create">+ Criar rolê</button>' +
    '</div>' +
    '</div>' +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    '<div class="hero">' +
    '<div class="hero__eyebrow">Sua turma, seu convite</div>' +
    '<h1>Bora organizar o próximo rolê?</h1>' +
    '<p>Crie um convite bonito em minutos, compartilhe no WhatsApp e acompanhe quem confirmou — tudo num só lugar.</p>' +
    '</div>' +
    '<div class="section-label">Seus rolês</div>' +
    board +
    '<div style="text-align:center; margin-top:40px; display:flex; flex-direction:column; gap:10px; align-items:center;">' +
    (state.session.identified
      ? `<button class="link-btn" style="color:var(--muted-2);" data-action="go-entrar">conectado como ${escapeHtml(state.session.email ?? '')}</button>`
      : '<button class="link-btn" style="color:var(--muted-2);" data-action="go-entrar">salvar meus rolês em outro aparelho</button>') +
    '<button class="link-btn" style="color:var(--muted-2);" data-action="go-privacy">privacidade e seus dados</button>' +
    '</div>'
  );
}
