import type { EventRecord, NewEventInput, ThemeColor } from '../types';
import { COLORS, EMOJIS, state } from '../state';
import { escapeHtml } from '../lib/format';
import { stubDate } from '../lib/date';

export interface CreateDraft {
  emoji: string;
  color: ThemeColor;
}

export const createDraft: CreateDraft = { emoji: '🎉', color: 'coral' };

export function resetCreateDraft(): void {
  createDraft.emoji = '🎉';
  createDraft.color = 'coral';
}

export function prefillCreateDraft(ev: EventRecord): void {
  createDraft.emoji = ev.emoji;
  createDraft.color = ev.color;
}

/**
 * Atalhos pro primeiro rolê. O caminho de 30 segundos importa mais que a
 * flexibilidade: quem nunca criou nada não sabe o que escrever no campo vazio.
 */
interface Template {
  id: string;
  label: string;
  emoji: string;
  color: ThemeColor;
  title: string;
  description: string;
  time: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'aniversario',
    label: '🎂 Aniversário',
    emoji: '🎂',
    color: 'coral',
    title: 'Aniversário do/da ',
    description: 'Bora comemorar junto! Traz quem quiser, só me avisa aqui quantos vêm 😄',
    time: '20:00',
  },
  {
    id: 'churrasco',
    label: '🍖 Churrasco',
    emoji: '🍖',
    color: 'yellow',
    title: 'Churrasco na ',
    description: 'Eu garanto a carne e o carvão. Confirma aí pra eu saber quantas bocas vêm 🥩',
    time: '13:00',
  },
  {
    id: 'junina',
    label: '🔥 Festa junina',
    emoji: '🔥',
    color: 'yellow',
    title: 'Arraiá d',
    description: 'Quentão, pipoca, pé de moleque e quadrilha. Vem de xadrez! 🌽',
    time: '19:00',
  },
  {
    id: 'balada',
    label: '🕺 Festa',
    emoji: '🕺',
    color: 'purple',
    title: '',
    description: 'Line-up caprichado, bar aberto e a galera toda. Confirma presença aqui 👇',
    time: '22:00',
  },
];

function templateChips(): string {
  return (
    '<div class="field">' +
    '<label>Começar de um modelo <span style="text-transform:none; font-weight:400; opacity:.7;">(opcional)</span></label>' +
    '<div class="picker-row" id="templatePicker">' +
    TEMPLATES.map(
      (t) => `<button type="button" class="template-chip" data-template="${t.id}">${t.label}</button>`,
    ).join('') +
    '</div></div>'
  );
}

/** Campos que só fazem sentido quando o rolê pertence a uma produtora. */
function proFields(ev: EventRecord | null): string {
  if (!state.orgs.length) return '';
  const current = ev?.orgId ?? '';
  const options =
    '<option value="">Rolê pessoal</option>' +
    state.orgs
      .map(
        (o) =>
          `<option value="${o.id}"${o.id === current ? ' selected' : ''}>${escapeHtml(o.name)}</option>`,
      )
      .join('');
  return (
    '<div class="field">' +
    '<label>Produtora</label>' +
    `<select id="fOrg" class="pro-input" style="width:100%">${options}</select>` +
    '<div class="helptext">Rolê de produtora entra na base de público e libera portaria e promoters.</div>' +
    '</div>' +
    '<div class="field field-row">' +
    `<div><label>Ingresso (R$)</label><input type="number" id="fPrice" min="0" step="5" placeholder="0" value="${ev?.ticketPrice || ''}"></div>` +
    `<div><label>Lotação</label><input type="number" id="fCapacity" min="1" placeholder="sem limite" value="${ev?.capacity ?? ''}"></div>` +
    '</div>'
  );
}

export function renderCreate(): string {
  const editing = state.route.name === 'edit';
  const ev = editing ? state.event : null;
  if (editing && state.loading) return '<div class="loading-note">Abrindo o rolê...</div>';
  if (editing && !ev) {
    return (
      '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
      '<div class="error-note">Não encontrei esse rolê.</div>'
    );
  }

  const emojiBtns = EMOJIS.map(
    (e) =>
      `<button type="button" class="emoji-btn${e === createDraft.emoji ? ' is-selected' : ''}" data-emoji="${e}">${e}</button>`,
  ).join('');
  const colorBtns = (Object.keys(COLORS) as ThemeColor[])
    .map(
      (c) =>
        `<button type="button" class="color-swatch${c === createDraft.color ? ' is-selected' : ''}" data-color="${c}" style="background:${COLORS[c].accent}" aria-label="Cor ${c}"></button>`,
    )
    .join('');

  const back = editing
    ? `<button class="back-btn" data-action="open-event" data-id="${ev!.id}">← voltar pro rolê</button>`
    : '<button class="back-btn" data-action="go-home">← voltar</button>';

  return (
    `<div class="topbar">${back}</div>` +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    `<div class="hero__eyebrow" style="margin:6px 2px 2px;">${editing ? 'Editar rolê' : 'Novo rolê'}</div>` +
    `<h1 style="font-size:clamp(1.7rem,5vw,2.3rem); margin:8px 2px 26px;">${editing ? 'Ajustar o convite' : 'Vamos montar o convite'}</h1>` +
    '<div class="create-wrap">' +
    '<form class="panel" id="createForm">' +
    (editing ? '' : templateChips()) +
    '<div class="field"><label>Qual o emoji do rolê?</label>' +
    `<div class="picker-row" id="emojiPicker">${emojiBtns}</div></div>` +
    '<div class="field"><label>Título do evento</label>' +
    `<input type="text" id="fTitle" placeholder="Ex: Aniversário da Marina" maxlength="80" value="${escapeHtml(ev?.title ?? '')}" required></div>` +
    '<div class="field field-row">' +
    `<div><label>Data</label><input type="date" id="fDate" value="${ev?.date ?? ''}" required></div>` +
    `<div><label>Horário</label><input type="time" id="fTime" value="${ev?.time ?? '19:00'}" required></div>` +
    '</div>' +
    '<div class="field"><label>Local</label>' +
    `<input type="text" id="fLocation" placeholder="Ex: Rua Augusta, 123 — São Paulo" value="${escapeHtml(ev?.location ?? '')}" required></div>` +
    '<div class="field"><label>Descrição</label>' +
    `<textarea id="fDescription" placeholder="Conte o clima do rolê, o que levar, dress code...">${escapeHtml(ev?.description ?? '')}</textarea></div>` +
    '<div class="field"><label>Cor do convite</label>' +
    `<div class="picker-row" id="colorPicker">${colorBtns}</div></div>` +
    '<div class="field">' +
    '<label>Chave PIX para vaquinha <span style="text-transform:none; font-weight:400; opacity:.7;">(opcional)</span></label>' +
    `<input type="text" id="fPix" placeholder="Ex: seunome@pix.com.br" value="${escapeHtml(ev?.pix ?? '')}">` +
    '<div class="helptext">Aparece no convite pra galera ajudar com bebida, comida etc.</div>' +
    '</div>' +
    proFields(ev) +
    `<button type="submit" class="submit-btn" ${state.busy ? 'disabled' : ''}>` +
    `${state.busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar convite 🎉'}</button>` +
    (editing
      ? `<button type="button" class="link-btn" style="display:block; margin:18px auto 0;" data-action="delete-event" data-id="${ev!.id}">apagar este rolê</button>`
      : '') +
    '</form>' +
    '<div>' +
    '<div class="preview-label">Prévia do convite</div>' +
    '<div class="pv-card" id="pvCard">' +
    `<div class="pv-cover" id="pvCover" style="--pv-tint:${COLORS[createDraft.color].tint}">` +
    `<div class="pv-emoji" id="pvEmoji">${createDraft.emoji}</div>` +
    '<div class="pv-date" id="pvDate">escolha uma data</div>' +
    `<div class="pv-title" id="pvTitle">${escapeHtml(ev?.title || 'Título do seu rolê')}</div>` +
    '</div>' +
    '<div class="pv-body">' +
    `<div class="pv-row"><span>📍</span><span id="pvLocation">${escapeHtml(ev?.location || 'Local aparece aqui')}</span></div>` +
    `<div class="pv-desc" id="pvDesc">${escapeHtml(ev?.description || PLACEHOLDER_DESC)}</div>` +
    '</div></div></div></div>'
  );
}

const PLACEHOLDER_DESC = 'A descrição do seu convite aparece aqui, em tempo real, conforme você escreve.';

/** Liga a prévia ao vivo. Chamado após cada render da tela de criação. */
export function wireCreatePreview(): void {
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const pvEmoji = byId('pvEmoji');
  const pvTitle = byId('pvTitle');
  const pvDate = byId('pvDate');
  const pvLocation = byId('pvLocation');
  const pvDesc = byId('pvDesc');
  const pvCover = byId('pvCover');
  const fTitle = byId<HTMLInputElement>('fTitle');
  const fLocation = byId<HTMLInputElement>('fLocation');
  const fDescription = byId<HTMLTextAreaElement>('fDescription');
  const fDate = byId<HTMLInputElement>('fDate');
  const fTime = byId<HTMLInputElement>('fTime');
  if (!pvTitle || !pvDate || !pvLocation || !pvDesc || !pvCover || !pvEmoji) return;
  if (!fTitle || !fLocation || !fDescription || !fDate || !fTime) return;

  fTitle.addEventListener('input', () => {
    pvTitle.textContent = fTitle.value || 'Título do seu rolê';
  });
  fLocation.addEventListener('input', () => {
    pvLocation.textContent = fLocation.value || 'Local aparece aqui';
  });
  fDescription.addEventListener('input', () => {
    pvDesc.textContent = fDescription.value || PLACEHOLDER_DESC;
  });

  const syncDate = () => {
    if (!fDate.value) {
      pvDate.textContent = 'escolha uma data';
      return;
    }
    const s = stubDate(fDate.value);
    pvDate.textContent = `${s.wd} · ${s.day} ${s.mon}${fTime.value ? ` · ${fTime.value}` : ''}`;
  };
  fDate.addEventListener('input', syncDate);
  fTime.addEventListener('input', syncDate);
  syncDate();

  const selectEmoji = (emoji: string) => {
    createDraft.emoji = emoji;
    pvEmoji.textContent = emoji;
    document.querySelectorAll('.emoji-btn').forEach((b) => {
      b.classList.toggle('is-selected', b.getAttribute('data-emoji') === emoji);
    });
  };
  const selectColor = (color: ThemeColor) => {
    createDraft.color = color;
    pvCover.style.setProperty('--pv-tint', COLORS[color].tint);
    document.querySelectorAll('.color-swatch').forEach((b) => {
      b.classList.toggle('is-selected', b.getAttribute('data-color') === color);
    });
  };

  byId('emojiPicker')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.emoji-btn');
    if (btn) selectEmoji(btn.getAttribute('data-emoji') ?? '🎉');
  });

  byId('colorPicker')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.color-swatch');
    if (btn) selectColor((btn.getAttribute('data-color') as ThemeColor) ?? 'coral');
  });

  byId('templatePicker')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.template-chip');
    if (!btn) return;
    const tpl = TEMPLATES.find((t) => t.id === btn.getAttribute('data-template'));
    if (!tpl) return;
    document.querySelectorAll('.template-chip').forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectEmoji(tpl.emoji);
    selectColor(tpl.color);
    fTitle.value = tpl.title;
    fDescription.value = tpl.description;
    fTime.value = tpl.time;
    pvTitle.textContent = tpl.title || 'Título do seu rolê';
    pvDesc.textContent = tpl.description;
    syncDate();
    fTitle.focus();
    fTitle.setSelectionRange(tpl.title.length, tpl.title.length);
  });
}

/** Lê o formulário. Retorna null quando falta campo obrigatório. */
export function readCreateForm(): NewEventInput | null {
  const value = (id: string) =>
    (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() ?? '';
  const title = value('fTitle');
  const date = value('fDate');
  const time = value('fTime');
  const location = value('fLocation');
  if (!title || !date || !time || !location) return null;

  const orgId = (document.getElementById('fOrg') as HTMLSelectElement | null)?.value || null;
  const priceRaw = value('fPrice');
  const capacityRaw = value('fCapacity');

  return {
    emoji: createDraft.emoji,
    title,
    date,
    time,
    location,
    description: value('fDescription'),
    color: createDraft.color,
    pix: value('fPix'),
    orgId,
    ticketPrice: priceRaw ? Math.max(0, parseFloat(priceRaw)) : 0,
    capacity: capacityRaw ? Math.max(1, parseInt(capacityRaw, 10)) : null,
  };
}
