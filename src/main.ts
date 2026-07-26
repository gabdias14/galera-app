import './styles/main.css';

import type { RsvpStatus } from './types';
import { state } from './state';
import { getAdapter } from './data';
import { addKnownEvent } from './data/known';
import { setMyName } from './data/identity';
import { navigate, onRouteChange, parseRoute, inviteUrl, type Route } from './router';
import { fireStamp, fireToast } from './ui/fx';
import { renderHome } from './views/home';
import { readCreateForm, renderCreate, resetCreateDraft, wireCreatePreview } from './views/create';
import { renderEvent } from './views/event';
import { buildRecapData, canvasToBlob, recapFileName, renderRecap } from './lib/recap';

const app = document.getElementById('app') as HTMLElement;
const data = getAdapter();

let unsubscribe: (() => void) | null = null;
let recapBlob: Blob | null = null;
let lastRenderedRoute = '';

/* ===================== render ===================== */

/** Guarda foco e cursor: o app redesenha inteiro a cada mudança de estado. */
function captureFocus(): { id: string; start: number | null; end: number | null } | null {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !el.id || !('value' in el)) return null;
  return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
}

function restoreFocus(snapshot: ReturnType<typeof captureFocus>): void {
  if (!snapshot) return;
  const el = document.getElementById(snapshot.id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  el.focus();
  if (snapshot.start !== null && snapshot.end !== null && el.type !== 'date' && el.type !== 'time') {
    try {
      el.setSelectionRange(snapshot.start, snapshot.end);
    } catch {
      /* inputs que não suportam seleção */
    }
  }
}

function render(): void {
  const focus = captureFocus();
  if (state.route.name === 'home') app.innerHTML = renderHome();
  else if (state.route.name === 'create') {
    app.innerHTML = renderCreate();
    wireCreatePreview();
  } else app.innerHTML = renderEvent();

  const routeKey = `${state.route.name}:${state.route.name === 'event' ? state.route.id : ''}`;
  if (routeKey !== lastRenderedRoute) {
    lastRenderedRoute = routeKey;
    window.scrollTo({ top: 0 });
  }
  restoreFocus(focus);
}

/* ===================== carregamento por rota ===================== */

async function loadRoute(route: Route): Promise<void> {
  unsubscribe?.();
  unsubscribe = null;
  state.route = route;
  state.error = null;

  if (route.name === 'create') {
    resetCreateDraft();
    state.loading = false;
    render();
    return;
  }

  if (route.name === 'home') {
    state.loading = true;
    state.event = null;
    render();
    try {
      state.events = await data.listEvents();
    } catch (err) {
      state.error = messageOf(err);
    }
    state.loading = false;
    render();
    return;
  }

  state.loading = true;
  state.event = null;
  state.eventTab = 'convite';
  state.showPollForm = false;
  state.lightboxPhotoId = null;
  closeRecap();
  render();

  try {
    const ev = await data.getEvent(route.id);
    state.event = ev;
    if (ev) {
      addKnownEvent(ev.id);
      // Quem não é anfitrião só existe como convidado.
      state.guestMode = !ev.isHost;
      unsubscribe = data.subscribe(ev.id, () => void refreshEvent());
    }
  } catch (err) {
    state.error = messageOf(err);
  }
  state.loading = false;
  render();
}

async function refreshEvent(): Promise<void> {
  if (state.route.name !== 'event') return;
  try {
    state.event = await data.getEvent(state.route.id);
    render();
  } catch (err) {
    console.warn('[galera] falha ao atualizar o rolê:', err);
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Algo deu errado. Tenta de novo?';
}

/** Executa uma mutação, mostra erro amigável e recarrega o rolê. */
async function withBusy(fn: () => Promise<void>): Promise<void> {
  if (state.busy) return;
  state.busy = true;
  state.error = null;
  render();
  try {
    await fn();
  } catch (err) {
    state.error = messageOf(err);
  }
  state.busy = false;
  await refreshEvent();
  render();
}

/* ===================== recap ===================== */

function closeRecap(): void {
  state.recapOpen = false;
  state.recapLoading = false;
  state.recapUrl = null;
  recapBlob = null;
}

async function openRecap(): Promise<void> {
  const ev = state.event;
  if (!ev) return;
  state.recapOpen = true;
  state.recapLoading = true;
  state.recapUrl = null;
  render();
  try {
    const canvas = await renderRecap(buildRecapData(ev));
    recapBlob = await canvasToBlob(canvas);
    state.recapUrl = URL.createObjectURL(recapBlob);
  } catch (err) {
    console.error('[galera] recap:', err);
    state.recapUrl = null;
  }
  state.recapLoading = false;
  render();
}

async function shareRecap(): Promise<void> {
  const ev = state.event;
  if (!recapBlob || !ev) return;
  const file = new File([recapBlob], recapFileName(ev.title), { type: 'image/png' });
  const shareData: ShareData = {
    files: [file],
    title: ev.title,
    text: `${ev.emoji} ${ev.title} — criado no Galera. Crie o seu: ${inviteUrl(ev.id)}`,
  };
  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  downloadRecap();
  fireToast('Recap baixado! Agora é só postar 📲');
}

function downloadRecap(): void {
  const ev = state.event;
  if (!state.recapUrl || !ev) return;
  const a = document.createElement('a');
  a.href = state.recapUrl;
  a.download = recapFileName(ev.title);
  a.click();
}

/* ===================== eventos de UI ===================== */

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');

  switch (action) {
    case 'go-home':
      navigate({ name: 'home' });
      break;
    case 'go-create':
      navigate({ name: 'create' });
      break;
    case 'open-event':
      navigate({ name: 'event', id: target.getAttribute('data-id') ?? '' });
      break;
    case 'set-mode': {
      const ev = state.event;
      if (!ev?.isHost) break;
      state.guestMode = target.getAttribute('data-mode') === 'guest';
      render();
      break;
    }
    case 'set-tab':
      state.eventTab = (target.getAttribute('data-tab') as typeof state.eventTab) ?? 'convite';
      state.showPollForm = false;
      render();
      break;
    case 'change-rsvp':
      state.myName = '';
      setMyName('');
      render();
      break;
    case 'copy-link':
      void copyInviteLink(target);
      break;
    case 'rsvp':
      void submitRsvp(target.getAttribute('data-status') as RsvpStatus);
      break;
    case 'toggle-poll-form':
      state.showPollForm = !state.showPollForm;
      render();
      break;
    case 'vote-poll':
      void submitVote(target.getAttribute('data-poll'), target.getAttribute('data-option'));
      break;
    case 'notify-poll':
      void notifyPoll(target.getAttribute('data-poll'));
      break;
    case 'open-photo':
      state.lightboxPhotoId = target.getAttribute('data-photo');
      render();
      break;
    case 'close-lightbox':
      state.lightboxPhotoId = null;
      render();
      break;
    case 'open-recap':
      void openRecap();
      break;
    case 'share-recap':
      e.stopPropagation();
      void shareRecap();
      break;
    case 'download-recap':
      e.stopPropagation();
      downloadRecap();
      break;
    case 'close-recap':
      closeRecap();
      render();
      break;
    default:
      break;
  }
});

async function copyInviteLink(target: HTMLElement): Promise<void> {
  const url = inviteUrl(target.getAttribute('data-id') ?? '');
  try {
    await navigator.clipboard.writeText(url);
    const original = target.textContent;
    target.textContent = '✅ Link copiado!';
    setTimeout(() => {
      target.textContent = original;
    }, 1600);
  } catch {
    fireToast(`Copie o link: ${url}`);
  }
}

async function submitRsvp(status: RsvpStatus): Promise<void> {
  const ev = state.event;
  if (!ev || !status) return;
  const input = document.getElementById('guestNameInput') as HTMLInputElement | null;
  const name = input?.value.trim() ?? '';
  if (!name) {
    const err = document.getElementById('rsvpError');
    if (err) err.style.display = 'block';
    input?.focus();
    return;
  }
  state.myName = name;
  setMyName(name);
  fireStamp(status);
  await withBusy(() => data.rsvp(ev.id, name, status));
}

async function submitVote(pollId: string | null, optionId: string | null): Promise<void> {
  const ev = state.event;
  if (!ev || !pollId || !optionId || !state.myName) return;
  await withBusy(() => data.votePoll(ev.id, pollId, optionId, state.myName));
}

async function notifyPoll(pollId: string | null): Promise<void> {
  const ev = state.event;
  if (!ev || !pollId) return;
  await withBusy(() => data.markPollNotified(ev.id, pollId));
  // Push real depende de servidor de notificação; por ora avisamos o anfitrião.
  fireToast(`🔔 Notificação enviada para ${ev.guests.length} convidado${ev.guests.length === 1 ? '' : 's'}!`);
}

document.addEventListener('submit', (e) => {
  const form = e.target as HTMLElement;

  if (form.id === 'createForm') {
    e.preventDefault();
    const input = readCreateForm();
    if (!input) return;
    void (async () => {
      state.busy = true;
      state.error = null;
      render();
      try {
        const created = await data.createEvent(input);
        addKnownEvent(created.id);
        state.busy = false;
        navigate({ name: 'event', id: created.id });
      } catch (err) {
        state.busy = false;
        state.error = messageOf(err);
        render();
      }
    })();
    return;
  }

  if (form.id === 'muralForm') {
    e.preventDefault();
    const ev = state.event;
    const input = document.getElementById('muralInput') as HTMLInputElement | null;
    const text = input?.value.trim() ?? '';
    if (!ev || !text) return;
    input!.value = '';
    void withBusy(() => data.addMuralPost(ev.id, text));
    return;
  }

  if (form.id === 'pollForm') {
    e.preventDefault();
    const ev = state.event;
    const question = (document.getElementById('pollQuestion') as HTMLInputElement | null)?.value.trim() ?? '';
    const options: string[] = [];
    for (let i = 0; i < 4; i++) {
      const v = (document.getElementById(`pollOpt${i}`) as HTMLInputElement | null)?.value.trim();
      if (v) options.push(v);
    }
    if (!ev || !question || options.length < 2) return;
    state.showPollForm = false;
    void withBusy(() => data.createPoll(ev.id, question, options));
  }
});

document.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id !== 'photoInput') return;
  const files = Array.from(input.files ?? []);
  const ev = state.event;
  if (!files.length || !ev) return;
  const uploader = state.myName || (ev.isHost && !state.guestMode ? 'Anfitrião' : 'Convidado');
  void withBusy(async () => {
    await data.addPhotos(ev.id, files, uploader);
    fireToast(`${files.length} foto${files.length === 1 ? '' : 's'} no álbum 📸`);
  });
});

/* ===================== boot ===================== */

onRouteChange((route) => void loadRoute(route));

async function boot(): Promise<void> {
  state.backend = data.kind;
  try {
    await data.init();
  } catch (err) {
    state.error = messageOf(err);
  }
  await loadRoute(parseRoute());
}

void boot();
