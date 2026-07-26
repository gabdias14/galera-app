import type { EventRecord, MuralPost, Photo, Poll } from '../types';
import { COLORS, state } from '../state';
import { escapeHtml, initials, plural, sameName } from '../lib/format';
import {
  MONTHS_FULL,
  eventIsUnlocked,
  longDate,
  parseDate,
  relativeDays,
  relativeTime,
  stubDate,
} from '../lib/date';
import { buildICS, googleCalUrl } from '../lib/calendar';

const POLL_COLORS = [
  'rgba(41,211,152,.55)',
  'rgba(255,201,77,.55)',
  'rgba(139,111,240,.55)',
  'rgba(255,90,114,.55)',
];

export function logoHtml(): string {
  return (
    '<button class="logo" data-action="go-home" aria-label="Início">' +
    '<span class="logo__mark">🎈</span>' +
    '<span><span class="logo__text">galera</span>' +
    '<svg class="squiggle" width="70" height="8" viewBox="0 0 70 8" aria-hidden="true">' +
    '<path d="M1 5 Q 9 1 17 5 T 33 5 T 49 5 T 65 5" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</svg></span></button>'
  );
}

export function modeToggleHtml(): string {
  return (
    '<div class="mode-toggle">' +
    `<button class="${state.guestMode ? 'is-active' : ''}" data-action="set-mode" data-mode="guest">Convidado</button>` +
    `<button class="${!state.guestMode ? 'is-active' : ''}" data-action="set-mode" data-mode="host">Anfitrião</button>` +
    '</div>'
  );
}

export function reminderRowHtml(ev: EventRecord): string {
  const ics = `data:text/calendar;charset=utf8,${encodeURIComponent(buildICS(ev))}`;
  return (
    '<div class="reminder-row">' +
    `<a class="reminder-btn" href="${escapeHtml(googleCalUrl(ev))}" target="_blank" rel="noopener">📅 Google Agenda</a>` +
    `<a class="reminder-btn" href="${ics}" download="${escapeHtml(ev.title)}.ics">⬇️ Baixar .ics</a>` +
    '</div>'
  );
}

export function inviteCardHtml(ev: EventRecord, opts: { showRsvp?: boolean } = {}): string {
  const tint = COLORS[ev.color].tint;
  const stub = stubDate(ev.date);
  let rsvpHtml = '';

  if (opts.showRsvp) {
    const existing = state.myName ? ev.guests.find((g) => sameName(g.name, state.myName)) : undefined;
    if (existing) {
      const label =
        existing.status === 'vou' ? 'Vou! 🎉' : existing.status === 'talvez' ? 'Talvez 🤔' : 'Não vou 😢';
      rsvpHtml =
        '<div class="rsvp-block"><div class="confirmed-panel">' +
        `<div class="confirmed-panel__msg">Sua resposta: ${label}<small>${escapeHtml(existing.name)}</small></div>` +
        '<button class="link-btn" data-action="change-rsvp">alterar resposta</button>' +
        '</div></div>';
    } else {
      rsvpHtml =
        '<div class="rsvp-block">' +
        '<div class="rsvp-title">Você vai?</div>' +
        `<input type="text" class="name-input" id="guestNameInput" placeholder="Seu nome" value="${escapeHtml(state.myName)}" autocomplete="name">` +
        '<div class="name-error" id="rsvpError" style="display:none;">Digite seu nome antes de responder 🙂</div>' +
        '<div class="rsvp-btns">' +
        '<button class="rsvp-btn rsvp-btn--vou" data-action="rsvp" data-status="vou">Vou! 🎉</button>' +
        '<button class="rsvp-btn rsvp-btn--talvez" data-action="rsvp" data-status="talvez">Talvez</button>' +
        '<button class="rsvp-btn rsvp-btn--nao" data-action="rsvp" data-status="nao">Não vou</button>' +
        '</div></div>';
    }
  }

  const pixHtml = ev.pix
    ? `<div class="invite-row"><span class="ic">💸</span><span>Vaquinha via PIX: <strong>${escapeHtml(ev.pix)}</strong></span></div>`
    : '';

  return (
    '<div class="invite-card">' +
    `<div class="invite-cover" style="--tint:${tint}">` +
    `<div class="invite-emoji">${ev.emoji}</div>` +
    `<div class="invite-date">${stub.wd}, ${stub.day} de ${MONTHS_FULL[parseDate(ev.date).getMonth()]} · ${ev.time}</div>` +
    `<div class="invite-title">${escapeHtml(ev.title)}</div>` +
    '</div>' +
    '<div class="invite-body">' +
    `<div class="invite-row"><span class="ic">📍</span><span>${escapeHtml(ev.location)}</span></div>` +
    `<div class="invite-row"><span class="ic">⏳</span><span>${relativeDays(ev.date)}</span></div>` +
    reminderRowHtml(ev) +
    pixHtml +
    (ev.description ? `<div class="invite-desc">${escapeHtml(ev.description)}</div>` : '') +
    rsvpHtml +
    '</div></div>'
  );
}

export function guestMosaicHtml(ev: EventRecord, max = 8): string {
  const going = ev.guests.filter((g) => g.status === 'vou');
  const shown = going.slice(0, max);
  const extra = going.length - shown.length;
  let avatars = shown
    .map(
      (g) =>
        `<div class="mini-avatar" style="width:34px;height:34px;font-size:.8rem;background:${g.color}">${initials(g.name)}</div>`,
    )
    .join('');
  if (extra > 0) {
    avatars += `<div class="mini-avatar" style="width:34px;height:34px;font-size:.75rem;background:rgba(255,255,255,.18)">+${extra}</div>`;
  }
  return (
    `<div class="mini-stack">${avatars}</div>` +
    `<div style="margin-top:8px; font-size:.86rem; color:var(--muted);">${going.length} ${plural(going.length, 'confirmado')}</div>`
  );
}

export function pollResultsHtml(poll: Poll, myName: string | null): string {
  const total = Object.values(poll.votes).reduce((sum, v) => sum + v.length, 0);
  const rows = poll.options
    .map((opt, i) => {
      const voters = poll.votes[opt.id] ?? [];
      const pct = total > 0 ? Math.round((voters.length / total) * 100) : 0;
      const mine = !!myName && voters.some((n) => sameName(n, myName));
      return (
        `<div class="poll-result${mine ? ' is-mine' : ''}">` +
        `<div class="poll-result-fill" style="width:${pct}%; background:${POLL_COLORS[i % POLL_COLORS.length]}"></div>` +
        `<div class="poll-result-content"><span>${escapeHtml(opt.text)}${mine ? ' ✓' : ''}</span><span>${pct}% (${voters.length})</span></div>` +
        '</div>'
      );
    })
    .join('');
  return `${rows}<div class="poll-meta">${total} ${plural(total, 'voto')}</div>`;
}

export function pollVoteHtml(poll: Poll): string {
  return poll.options
    .map(
      (opt) =>
        `<button type="button" class="poll-option-btn" data-action="vote-poll" data-poll="${poll.id}" data-option="${opt.id}">${escapeHtml(opt.text)}</button>`,
    )
    .join('');
}

export function pollFormHtml(): string {
  return (
    '<form class="poll-form" id="pollForm">' +
    '<input type="text" id="pollQuestion" placeholder="Pergunta da enquete" required>' +
    '<input type="text" id="pollOpt0" placeholder="Opção 1">' +
    '<input type="text" id="pollOpt1" placeholder="Opção 2">' +
    '<input type="text" id="pollOpt2" placeholder="Opção 3 (opcional)">' +
    '<input type="text" id="pollOpt3" placeholder="Opção 4 (opcional)">' +
    '<div class="poll-form-actions"><button type="submit" class="submit-btn" style="width:auto; padding:11px 22px;">Criar enquete</button></div>' +
    '</form>'
  );
}

export function muralPostHtml(post: MuralPost): string {
  return `<div class="mural-post"><p>${escapeHtml(post.text)}</p><time>${escapeHtml(relativeTime(post.createdAt))}</time></div>`;
}

function photoTileHtml(p: Photo): string {
  if (p.placeholder) {
    return `<button type="button" class="photo-tile photo-tile--placeholder" style="background:${p.gradient}" data-action="open-photo" data-photo="${p.id}">${p.emoji}</button>`;
  }
  return `<button type="button" class="photo-tile" data-action="open-photo" data-photo="${p.id}"><img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.caption || 'Foto do rolê')}" loading="lazy"></button>`;
}

export function albumSectionHtml(ev: EventRecord): string {
  if (!eventIsUnlocked(ev.date)) {
    return (
      '<div class="album-locked">' +
      '<div class="album-locked__emoji">📷</div>' +
      '<div style="font-weight:700;">O álbum abre no dia do rolê</div>' +
      `<div class="album-locked__sub">Volte por aqui em ${longDate(ev.date)} pra ver e postar fotos.</div>` +
      '</div>'
    );
  }
  const upload =
    '<label class="upload-zone">' +
    `<input type="file" id="photoInput" accept="image/*" multiple ${state.busy ? 'disabled' : ''}>` +
    `<div class="upload-zone__label">${state.busy ? '⏳ Enviando...' : '📷 Adicionar fotos'}</div>` +
    '<div class="upload-zone__sub">Escolha uma ou mais imagens do seu aparelho</div>' +
    '</label>';
  const grid = ev.photos.length
    ? `<div class="album-grid">${ev.photos.map(photoTileHtml).join('')}</div>`
    : '<div class="empty-note">Nenhuma foto ainda. Seja o primeiro a postar!</div>';
  return upload + grid;
}

export function lightboxHtml(ev: EventRecord): string {
  if (!state.lightboxPhotoId) return '';
  const photo = ev.photos.find((p) => p.id === state.lightboxPhotoId);
  if (!photo) return '';
  const media = photo.placeholder
    ? `<div style="width:100%; aspect-ratio:4/3; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:4rem; background:${photo.gradient}">${photo.emoji}</div>`
    : `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Foto do rolê')}">`;
  const meta =
    (photo.caption ? escapeHtml(photo.caption) : '') +
    (photo.uploader ? `${photo.caption ? ' · ' : ''}por ${escapeHtml(photo.uploader)}` : '');
  return (
    '<div class="lightbox" data-action="close-lightbox">' +
    '<button class="lightbox__close" data-action="close-lightbox" aria-label="Fechar">✕</button>' +
    '<div class="lightbox__inner" data-action="noop">' +
    media +
    (meta ? `<div class="lightbox__meta">${meta}</div>` : '') +
    '</div></div>'
  );
}

export function recapModalHtml(): string {
  if (!state.recapOpen) return '';
  const body = state.recapLoading
    ? '<div class="recap-loading">✨ Montando seu recap...</div>'
    : state.recapUrl
      ? `<img src="${state.recapUrl}" alt="Recap do rolê">` +
        '<div class="recap-actions">' +
        '<button class="share-btn share-btn--recap" data-action="share-recap">📲 Compartilhar</button>' +
        '<button class="share-btn share-btn--copy" data-action="download-recap">⬇️ Baixar</button>' +
        '</div>' +
        '<div class="recap-hint">Imagem 1080×1920, no tamanho do Stories.</div>'
      : '<div class="recap-loading">Não consegui gerar o recap agora 😕</div>';
  return (
    '<div class="recap-modal" data-action="close-recap">' +
    '<button class="lightbox__close" data-action="close-recap" aria-label="Fechar">✕</button>' +
    `<div class="recap-modal__inner" data-action="noop">${body}</div>` +
    '</div>'
  );
}
