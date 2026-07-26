import type { NewEventInput, ThemeColor } from '../types';
import { COLORS, EMOJIS, state } from '../state';
import { escapeHtml } from '../lib/format';
import { stubDate } from '../lib/date';

export const createDraft: { emoji: string; color: ThemeColor } = { emoji: '🎉', color: 'coral' };

export function resetCreateDraft(): void {
  createDraft.emoji = '🎉';
  createDraft.color = 'coral';
}

export function renderCreate(): string {
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

  return (
    '<div class="topbar"><button class="back-btn" data-action="go-home">← voltar</button></div>' +
    (state.error ? `<div class="error-note">${escapeHtml(state.error)}</div>` : '') +
    '<div class="hero__eyebrow" style="margin:6px 2px 2px;">Novo rolê</div>' +
    '<h1 style="font-size:clamp(1.7rem,5vw,2.3rem); margin:8px 2px 26px;">Vamos montar o convite</h1>' +
    '<div class="create-wrap">' +
    '<form class="panel" id="createForm">' +
    '<div class="field"><label>Qual o emoji do rolê?</label>' +
    `<div class="picker-row" id="emojiPicker">${emojiBtns}</div></div>` +
    '<div class="field"><label>Título do evento</label>' +
    '<input type="text" id="fTitle" placeholder="Ex: Aniversário da Marina" maxlength="80" required></div>' +
    '<div class="field field-row">' +
    '<div><label>Data</label><input type="date" id="fDate" required></div>' +
    '<div><label>Horário</label><input type="time" id="fTime" value="19:00" required></div>' +
    '</div>' +
    '<div class="field"><label>Local</label>' +
    '<input type="text" id="fLocation" placeholder="Ex: Rua Augusta, 123 — São Paulo" required></div>' +
    '<div class="field"><label>Descrição</label>' +
    '<textarea id="fDescription" placeholder="Conte o clima do rolê, o que levar, dress code..."></textarea></div>' +
    '<div class="field"><label>Cor do convite</label>' +
    `<div class="picker-row" id="colorPicker">${colorBtns}</div></div>` +
    '<div class="field">' +
    '<label>Chave PIX para vaquinha <span style="text-transform:none; font-weight:400; opacity:.7;">(opcional)</span></label>' +
    '<input type="text" id="fPix" placeholder="Ex: seunome@pix.com.br">' +
    '<div class="helptext">Aparece no convite pra galera ajudar com bebida, comida etc.</div>' +
    '</div>' +
    `<button type="submit" class="submit-btn" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Criando...' : 'Criar convite 🎉'}</button>` +
    '</form>' +
    '<div>' +
    '<div class="preview-label">Prévia do convite</div>' +
    '<div class="pv-card" id="pvCard">' +
    `<div class="pv-cover" id="pvCover" style="--pv-tint:${COLORS[createDraft.color].tint}">` +
    `<div class="pv-emoji" id="pvEmoji">${createDraft.emoji}</div>` +
    '<div class="pv-date" id="pvDate">escolha uma data</div>' +
    '<div class="pv-title" id="pvTitle">Título do seu rolê</div>' +
    '</div>' +
    '<div class="pv-body">' +
    '<div class="pv-row"><span>📍</span><span id="pvLocation">Local aparece aqui</span></div>' +
    '<div class="pv-desc" id="pvDesc">A descrição do seu convite aparece aqui, em tempo real, conforme você escreve.</div>' +
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

  byId('emojiPicker')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.emoji-btn');
    if (!btn) return;
    document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    createDraft.emoji = btn.getAttribute('data-emoji') ?? '🎉';
    pvEmoji.textContent = createDraft.emoji;
  });

  byId('colorPicker')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.color-swatch');
    if (!btn) return;
    document.querySelectorAll('.color-swatch').forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    createDraft.color = (btn.getAttribute('data-color') as ThemeColor) ?? 'coral';
    pvCover.style.setProperty('--pv-tint', COLORS[createDraft.color].tint);
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
  return {
    emoji: createDraft.emoji,
    title,
    date,
    time,
    location,
    description: value('fDescription'),
    color: createDraft.color,
    pix: value('fPix'),
  };
}
