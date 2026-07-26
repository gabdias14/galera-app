import type { EventRecord, RsvpStatus } from '../types';
import { state } from '../state';
import { escapeHtml, initials, sameName } from '../lib/format';
import { stubDate } from '../lib/date';
import { inviteUrl } from '../router';
import {
  albumSectionHtml,
  guestMosaicHtml,
  inviteCardHtml,
  lightboxHtml,
  modeToggleHtml,
  muralPostHtml,
  pollFormHtml,
  pollResultsHtml,
  pollVoteHtml,
  recapModalHtml,
  linksSectionHtml,
  remindersPanelHtml,
} from './components';

function topbarHtml(ev: EventRecord): string {
  return (
    '<div class="topbar">' +
    '<button class="back-btn" data-action="go-home">← voltar</button>' +
    (ev.isHost ? modeToggleHtml() : '') +
    '</div>'
  );
}

function shareRowHtml(ev: EventRecord): string {
  const url = inviteUrl(ev.id);
  const text = encodeURIComponent(`Bora pro rolê "${ev.title}"! Confirma presença aqui: ${url}`);
  return (
    '<div class="share-row">' +
    `<a class="share-btn share-btn--wa" href="https://wa.me/?text=${text}" target="_blank" rel="noopener">📲 Compartilhar no WhatsApp</a>` +
    `<button class="share-btn share-btn--copy" data-action="copy-link" data-id="${ev.id}">🔗 Copiar link do convite</button>` +
    '<button class="share-btn share-btn--recap" data-action="open-recap">✨ Gerar recap</button>' +
    `<button class="share-btn share-btn--copy" data-action="open-door" data-id="${ev.id}">🚪 Portaria</button>` +
    `<button class="share-btn share-btn--copy" data-action="edit-event" data-id="${ev.id}">✏️ Editar</button>` +
    '</div>'
  );
}

function pollsForGuestHtml(ev: EventRecord): string {
  if (!ev.polls.length) return '';
  const cards = ev.polls
    .map((poll) => {
      const voted =
        !!state.myName &&
        Object.values(poll.votes).some((names) => names.some((n) => sameName(n, state.myName)));
      const body = !state.myName
        ? '<div class="poll-meta">Confirme sua presença acima para poder votar 👆</div>'
        : voted
          ? pollResultsHtml(poll, state.myName)
          : pollVoteHtml(poll);
      return `<div class="poll-card"><div class="poll-question">${escapeHtml(poll.question)}</div>${body}</div>`;
    })
    .join('');
  return `<div class="guest-preview-strip"><div class="section-label">Enquetes</div>${cards}</div>`;
}

export function renderGuestView(ev: EventRecord): string {
  return (
    topbarHtml(ev) +
    '<div style="max-width:640px; margin:0 auto;">' +
    inviteCardHtml(ev, { showRsvp: true }) +
    '<div class="guest-preview-strip">' +
    '<div class="section-label">Quem confirmou</div>' +
    guestMosaicHtml(ev, 10) +
    '</div>' +
    pollsForGuestHtml(ev) +
    (ev.mural.length
      ? '<div class="guest-preview-strip"><div class="section-label">Avisos do anfitrião</div>' +
        ev.mural.map(muralPostHtml).join('') +
        '</div>'
      : '') +
    '<div class="guest-preview-strip">' +
    '<div class="section-label">Álbum do rolê</div>' +
    albumSectionHtml(ev) +
    '</div>' +
    '<div class="share-row" style="margin-top:26px;">' +
    '<button class="share-btn share-btn--recap" data-action="open-recap">✨ Gerar recap do rolê</button>' +
    '</div>' +
    '</div>'
  );
}

function guestGroupHtml(ev: EventRecord, status: RsvpStatus, label: string, color: string): string {
  const list = ev.guests.filter((g) => g.status === status);
  const rows = list.length
    ? list
        .map((g) => {
          const waTag = g.waOptIn
            ? `<button class="link-btn" style="font-size:.75rem;" data-action="guest-opt-out" data-id="${g.id}" title="Desligar avisos de WhatsApp">📲 desligar</button>`
            : '';
          return (
            '<div class="guest-row">' +
            `<div class="avatar" style="background:${g.color}">${initials(g.name)}</div>` +
            `<div class="guest-name" style="flex:1;">${escapeHtml(g.name)}</div>` +
            waTag +
            `<button class="link-btn" style="font-size:.75rem; color:var(--coral-dark);" data-action="forget-guest" data-id="${g.id}" title="Apagar os dados desta pessoa">apagar</button>` +
            '</div>'
          );
        })
        .join('')
    : '<div class="empty-note">Ninguém por aqui ainda.</div>';
  return (
    '<div class="guest-group">' +
    `<div class="guest-group__title"><span class="dot" style="background:${color}"></span>${label} (${list.length})</div>` +
    `<div class="guest-list">${rows}</div></div>`
  );
}

export function renderHostView(ev: EventRecord): string {
  const counts = {
    vou: ev.guests.filter((g) => g.status === 'vou').length,
    talvez: ev.guests.filter((g) => g.status === 'talvez').length,
    nao: ev.guests.filter((g) => g.status === 'nao').length,
  };

  const tab = (id: string, label: string) =>
    `<button class="tab-btn${state.eventTab === id ? ' is-active' : ''}" data-action="set-tab" data-tab="${id}">${label}</button>`;

  const tabs =
    '<div class="tabs">' +
    tab('convite', 'Convite') +
    tab('convidados', `Convidados (${ev.guests.length})`) +
    tab('enquete', `Enquetes${ev.polls.length ? ` (${ev.polls.length})` : ''}`) +
    tab('mural', 'Mural') +
    tab('album', 'Álbum') +
    tab('links', `Links${ev.links.length ? ` (${ev.links.length})` : ''}`) +
    '</div>';

  let body = '';
  if (state.eventTab === 'convite') {
    body =
      `<div style="max-width:640px;">${inviteCardHtml(ev, { showRsvp: false })}${shareRowHtml(ev)}` +
      `<div style="margin-top:22px;">${remindersPanelHtml(ev)}</div></div>`;
  } else if (state.eventTab === 'convidados') {
    body =
      '<div class="stat-row">' +
      `<div class="stat-chip"><b>${counts.vou}</b><span>vão</span></div>` +
      `<div class="stat-chip"><b>${counts.talvez}</b><span>talvez</span></div>` +
      `<div class="stat-chip"><b>${counts.nao}</b><span>não vão</span></div>` +
      '</div>' +
      guestGroupHtml(ev, 'vou', 'Confirmados', 'var(--green)') +
      guestGroupHtml(ev, 'talvez', 'Talvez', 'var(--yellow)') +
      guestGroupHtml(ev, 'nao', 'Não vão', '#FFFFFF');
  } else if (state.eventTab === 'enquete') {
    const polls = ev.polls.length
      ? ev.polls
          .map(
            (poll) =>
              '<div class="poll-card">' +
              `<div class="poll-question">${escapeHtml(poll.question)}</div>` +
              pollResultsHtml(poll, null) +
              '<div class="poll-actions">' +
              `<button class="poll-notify-btn" data-action="notify-poll" data-poll="${poll.id}"${poll.notified ? ' disabled' : ''}>` +
              `${poll.notified ? '✓ Convidados notificados' : '🔔 Notificar convidados'}</button>` +
              '</div></div>',
          )
          .join('')
      : '<div class="empty-note">Nenhuma enquete ainda. Crie uma pra saber o que a galera prefere!</div>';
    body =
      `<button class="new-poll-btn" data-action="toggle-poll-form">${state.showPollForm ? '✕ Cancelar' : '+ Nova enquete'}</button>` +
      (state.showPollForm ? pollFormHtml() : '') +
      polls;
  } else if (state.eventTab === 'mural') {
    body =
      '<form class="mural-form" id="muralForm">' +
      '<input type="text" id="muralInput" placeholder="Postar um aviso pra galera...">' +
      '<button type="submit">Postar</button>' +
      '</form>' +
      (ev.mural.length
        ? ev.mural.map(muralPostHtml).join('')
        : '<div class="empty-note">Nenhum aviso ainda. Poste algo pra sua galera!</div>');
  } else if (state.eventTab === 'links') {
    body = linksSectionHtml(ev);
  } else {
    body = albumSectionHtml(ev);
  }

  const stub = stubDate(ev.date);
  return (
    topbarHtml(ev) +
    '<div class="hero__eyebrow">Painel do anfitrião</div>' +
    `<h1 style="font-size:clamp(1.5rem,4.5vw,2.1rem); margin:8px 0 4px;">${ev.emoji} ${escapeHtml(ev.title)}</h1>` +
    `<p style="color:var(--muted); margin-bottom:22px;">${stub.wd}, ${stub.day} ${stub.mon} · ${ev.time} · ${escapeHtml(ev.location)}</p>` +
    tabs +
    body
  );
}

export function renderEvent(): string {
  if (state.loading) return '<div class="loading-note">Abrindo o convite...</div>';
  const ev = state.event;
  if (!ev) {
    const localHint =
      state.backend === 'local'
        ? '<div class="banner">Você está no <strong>modo local</strong>: os rolês ficam guardados só neste aparelho. ' +
          'Pra um convite abrir no celular da galera, configure o Supabase (veja <strong>docs/backend.md</strong>).</div>'
        : '';
    return (
      '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
      '<div class="error-note">Não encontrei esse rolê. O link pode ter expirado ou o convite foi apagado.</div>' +
      localHint
    );
  }
  const showGuest = state.guestMode || !ev.isHost;
  return (
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    (showGuest ? renderGuestView(ev) : renderHostView(ev)) +
    lightboxHtml(ev) +
    recapModalHtml()
  );
}
