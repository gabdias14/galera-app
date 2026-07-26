import './styles/main.css';

import type { EventRecord, RsvpStatus } from './types';
import { state } from './state';
import { getAdapter } from './data';
import { addKnownEvent } from './data/known';
import {
  allRememberedGuestRecords,
  forgetGuestToken,
  guestTokenFor,
  rememberGuestToken,
  setMyName,
} from './data/identity';
import { navigate, onRouteChange, parseRoute, inviteUrl, type ProTab, type Route } from './router';
import { fireStamp, fireToast } from './ui/fx';
import { renderHome } from './views/home';
import {
  prefillCreateDraft,
  readCreateForm,
  renderCreate,
  resetCreateDraft,
  wireCreatePreview,
} from './views/create';
import { renderEvent } from './views/event';
import { renderPro } from './views/pro';
import { renderPrivacidade } from './views/privacy';
import { renderDoor } from './views/door';
import { buildRecapData, canvasToBlob, recapFileName, renderRecap } from './lib/recap';
import { WALK_IN_CODE, buildContacts, filterAudience, scoreContacts, type Tier } from './lib/audience';
import { campaignMessage, reminderMessage } from './lib/messages';
import { normalizePhoneBR, waLink } from './lib/phone';
import { initAnalytics, installErrorReporting, track } from './lib/analytics';
import { sameName } from './lib/format';
import { NameTakenError } from './types';

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
  const route = state.route;

  if (route.name === 'home') app.innerHTML = renderHome();
  else if (route.name === 'create' || route.name === 'edit') {
    app.innerHTML = renderCreate();
    wireCreatePreview();
  } else if (route.name === 'privacidade') app.innerHTML = renderPrivacidade();
  else if (route.name === 'pro') app.innerHTML = renderPro();
  else if (route.name === 'door') {
    app.innerHTML = state.loading
      ? '<div class="loading-note">Abrindo a portaria...</div>'
      : state.event
        ? renderDoor(state.event)
        : '<div class="error-note">Rolê não encontrado.</div>';
  } else app.innerHTML = renderEvent();

  const routeKey = route.name + ':' + ('id' in route ? route.id : '');
  if (routeKey !== lastRenderedRoute) {
    lastRenderedRoute = routeKey;
    window.scrollTo({ top: 0 });
  }
  restoreFocus(focus);
}

function messageOf(err: unknown): string {
  if (err instanceof NameTakenError) return err.message;
  return err instanceof Error ? err.message : 'Algo deu errado. Tenta de novo?';
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
    // carrega em segundo plano: sem produtora o seletor simplesmente não aparece
    data
      .listOrgs()
      .then((orgs) => {
        state.orgs = orgs;
        if (state.route.name === 'create') render();
      })
      .catch(() => undefined);
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

  if (route.name === 'privacidade') {
    state.loading = false;
    render();
    return;
  }

  if (route.name === 'pro') {
    state.proTab = route.tab;
    await loadPro();
    return;
  }

  if (route.name === 'edit') {
    state.loading = true;
    render();
    try {
      const [ev, orgs] = await Promise.all([data.getEvent(route.id), data.listOrgs()]);
      state.event = ev;
      state.orgs = orgs;
      if (ev) prefillCreateDraft(ev);
    } catch (err) {
      state.error = messageOf(err);
    }
    state.loading = false;
    render();
    return;
  }

  // event | door
  state.loading = true;
  state.event = null;
  state.outbox = [];
  if (route.name === 'event') {
    state.eventTab = 'convite';
    state.showPollForm = false;
    state.lightboxPhotoId = null;
    state.linkCode = route.code;
    closeRecap();
  } else {
    state.doorSearch = '';
    state.doorAmount = null;
  }
  render();

  try {
    const ev = await data.getEvent(route.id);
    state.event = ev;
    if (ev) {
      addKnownEvent(ev.id);
      state.guestMode = route.name === 'event' ? !ev.isHost : false;
      if (ev.isHost) state.outbox = await data.listOutbox(ev.id);
      // conta a abertura do link do promoter — só uma vez por visita
      if (route.name === 'event' && route.code) await data.registerLinkOpen(ev.id, route.code);
      unsubscribe = data.subscribe(ev.id, () => void refreshEvent());
    }
  } catch (err) {
    state.error = messageOf(err);
  }
  state.loading = false;
  render();
}

async function loadPro(): Promise<void> {
  state.loading = true;
  render();
  try {
    state.orgs = await data.listOrgs();
    const org = state.orgs.find((o) => o.id === state.orgId) ?? state.orgs[0];
    state.orgId = org?.id ?? null;
    if (org) {
      state.orgEvents = await data.listOrgEvents(org.id);
      state.promoters = await data.listPromoters(org.id);
      state.audience = scoreContacts(buildContacts(state.orgEvents));
      const target =
        state.orgEvents.find((e) => e.id === state.campaignEventId) ??
        state.orgEvents.find((e) => !isPast(e));
      state.campaignEventId = target?.id ?? null;
      state.outbox = target ? await data.listOutbox(target.id) : [];
    }
  } catch (err) {
    state.error = messageOf(err);
  }
  state.loading = false;
  render();
}

function isPast(ev: EventRecord): boolean {
  return ev.date < new Date().toISOString().slice(0, 10);
}

async function refreshEvent(): Promise<void> {
  const route = state.route;
  if (route.name !== 'event' && route.name !== 'door') return;
  try {
    state.event = await data.getEvent(route.id);
    if (state.event?.isHost) state.outbox = await data.listOutbox(route.id);
    render();
  } catch (err) {
    console.warn('[galera] falha ao atualizar o rolê:', err);
  }
}

/** Executa uma mutação, mostra erro amigável e recarrega o que está na tela. */
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
  if (state.route.name === 'pro') await loadPro();
  else {
    await refreshEvent();
    render();
  }
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
    track('recap_gerado', { comFotos: ev.photos.some((p) => !!p.url) }, ev.id);
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
    text: `${ev.emoji} ${ev.title} — criado no Galera. Crie o seu: ${inviteUrl(ev.id, null, 'recap')}`,
  };
  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      track('recap_compartilhado', { method: 'share' }, ev.id);
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
  track('recap_compartilhado', { method: 'download' }, ev.id);
}

/* ===================== campanha e mensagens ===================== */

async function buildCampaign(eventId: string): Promise<void> {
  const target = state.orgEvents.find((e) => e.id === eventId);
  if (!target) return;
  // onlyOptIn é forçado: campanha só vai pra quem autorizou
  const selected = filterAudience(state.audience, { ...state.audienceFilter, onlyOptIn: true });
  if (!selected.length) {
    fireToast('Ninguém no filtro autorizou WhatsApp.');
    return;
  }
  const promoter = state.promoters.find((p) => p.id === state.campaignPromoterId) ?? null;
  const label = promoter
    ? `Campanha • ${promoter.name}`
    : `Campanha • ${new Date().toLocaleDateString('pt-BR')}`;

  await withBusy(async () => {
    const link = await data.createGuestLink(eventId, {
      label,
      promoterId: promoter?.id ?? null,
      maxUses: null,
    });
    const url = inviteUrl(eventId, link.code);
    await data.queueMessages(
      eventId,
      selected.map((c) => ({
        toName: c.name,
        toPhone: c.phone as string,
        kind: 'campanha' as const,
        text: campaignMessage(c.name, target, url),
      })),
    );
    state.campaignEventId = eventId;
  });
  fireToast(`${selected.length} mensagens na fila 📲`);
}

async function buildReminders(eventId: string): Promise<void> {
  const ev = state.event;
  if (!ev) return;
  const targets = ev.guests.filter((g) => g.waOptIn && g.phone && g.status !== 'nao');
  if (!targets.length) {
    fireToast('Ninguém autorizou WhatsApp ainda.');
    return;
  }
  const url = inviteUrl(eventId);
  await withBusy(() =>
    data.queueMessages(
      eventId,
      targets.map((g) => ({
        toName: g.name,
        toPhone: g.phone as string,
        kind: 'lembrete' as const,
        text: reminderMessage(g.name, ev, url),
      })),
    ),
  );
  fireToast(`${targets.length} lembretes prontos 📲`);
}

/** Abre o WhatsApp com o texto pronto e marca a mensagem como enviada. */
async function sendMessage(messageId: string): Promise<void> {
  const msg = state.outbox.find((m) => m.id === messageId);
  if (!msg) return;
  window.open(waLink(msg.toPhone, msg.text), '_blank', 'noopener');
  await withBusy(async () => {
    await data.markMessageSent(msg.id);
    state.outbox = await data.listOutbox(msg.eventId);
  });
}

async function sendNext(): Promise<void> {
  const next = state.outbox.find((m) => m.status === 'pendente');
  if (!next) return;
  await sendMessage(next.id);
}

function exportCampaignCsv(): void {
  const rows = state.outbox.filter((m) => m.kind === 'campanha');
  if (!rows.length) return;
  const csv = [
    'nome,telefone,status,mensagem',
    ...rows.map((m) => `"${m.toName}","${m.toPhone}","${m.status}","${m.text.replace(/"/g, '""')}"`),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campanha-galera.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== eventos de UI ===================== */

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  const id = target.getAttribute('data-id') ?? '';

  switch (action) {
    case 'go-home':
      navigate({ name: 'home' });
      break;
    case 'go-create':
      navigate({ name: 'create' });
      break;
    case 'go-pro':
      navigate({ name: 'pro', tab: state.proTab });
      break;
    case 'go-privacy':
      navigate({ name: 'privacidade' });
      break;
    case 'open-event':
      navigate({ name: 'event', id, code: null });
      break;
    case 'open-door':
      navigate({ name: 'door', id });
      break;
    case 'pro-tab':
      navigate({ name: 'pro', tab: (target.getAttribute('data-tab') as ProTab) ?? 'painel' });
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
    case 'edit-event':
      navigate({ name: 'edit', id });
      break;
    case 'delete-event':
      void deleteEvent(id);
      break;
    case 'guest-opt-out':
      void setConsent(id, false);
      break;
    case 'forget-guest':
      void forgetGuest(id);
      break;
    case 'forget-everything':
      void forgetEverything();
      break;
    case 'copy-link':
      void copyToClipboard(target, inviteUrl(id));
      break;
    case 'copy-guest-link':
      void copyToClipboard(target, inviteUrl(id, target.getAttribute('data-code')));
      break;
    case 'share-guest-link': {
      const url = inviteUrl(id, target.getAttribute('data-code'));
      const ev = state.event;
      const text = `Bora pro rolê${ev ? ` "${ev.title}"` : ''}! Confirma presença aqui: ${url}`;
      window.open(waLink(null, text), '_blank', 'noopener');
      break;
    }
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

    /* ---------- pro ---------- */
    case 'toggle-tier': {
      const tier = target.getAttribute('data-tier') as Tier;
      const current = state.audienceFilter.tiers ?? [];
      state.audienceFilter = {
        ...state.audienceFilter,
        tiers: current.includes(tier) ? current.filter((t) => t !== tier) : [...current, tier],
      };
      render();
      break;
    }
    case 'build-campaign':
      void buildCampaign(id);
      break;
    case 'build-reminders':
      void buildReminders(id);
      break;
    case 'send-next':
      void sendNext();
      break;
    case 'send-message':
      void sendMessage(id);
      break;
    case 'export-campaign':
      exportCampaignCsv();
      break;
    case 'clear-campaign':
      void clearQueue();
      break;
    case 'toggle-promoter': {
      const promoter = state.promoters.find((p) => p.id === id);
      if (promoter) void withBusy(() => data.updatePromoter(promoter.id, { active: !promoter.active }));
      break;
    }

    /* ---------- portaria ---------- */
    case 'checkin':
      void doCheckIn(id);
      break;
    case 'undo-checkin': {
      const ev = state.event;
      if (ev) void withBusy(() => data.undoCheckIn(ev.id, id));
      break;
    }
    case 'walk-in':
      void walkIn();
      break;

    default:
      break;
  }
});

async function deleteEvent(eventId: string): Promise<void> {
  const ev = state.event ?? state.events.find((e) => e.id === eventId);
  if (!ev) return;
  const ok = window.confirm(
    `Apagar "${ev.title}"? Some o convite, a lista de confirmados e o álbum. Não dá pra desfazer.`,
  );
  if (!ok) return;
  try {
    await data.deleteEvent(eventId);
    fireToast('Rolê apagado.');
    navigate({ name: 'home' });
  } catch (err) {
    state.error = messageOf(err);
    render();
  }
}

async function setConsent(guestId: string, waOptIn: boolean): Promise<void> {
  const ev = state.event;
  if (!ev) return;
  await withBusy(() => data.setGuestConsent(ev.id, guestId, waOptIn));
  fireToast(waOptIn ? 'Avisos religados.' : 'Pessoa descadastrada do WhatsApp.');
}

async function forgetGuest(guestId: string): Promise<void> {
  const ev = state.event;
  if (!ev) return;
  const guest = ev.guests.find((g) => g.id === guestId);
  const ok = window.confirm(
    `Apagar os dados de ${guest?.name ?? 'convidado'} deste rolê? Some a resposta, o telefone e os votos.`,
  );
  if (!ok) return;
  await withBusy(() => data.deleteGuest(ev.id, guestId));
  if (guest && sameName(guest.name, state.myName)) {
    forgetGuestToken(ev.id);
    state.myName = '';
    setMyName('');
  }
  fireToast('Dados apagados.');
}

async function forgetEverything(): Promise<void> {
  const records = allRememberedGuestRecords();
  if (!records.length) {
    fireToast('Este aparelho não tem nenhuma resposta registrada.');
    return;
  }
  const ok = window.confirm(
    `Apagar sua resposta, telefone e votos de ${records.length} ${records.length === 1 ? 'rolê' : 'rolês'}?`,
  );
  if (!ok) return;
  state.error = null;
  for (const { eventId, guestId } of records) {
    try {
      await data.deleteGuest(eventId, guestId);
    } catch (err) {
      console.warn('[galera] falha ao apagar convidado', eventId, err);
    }
    forgetGuestToken(eventId);
  }
  state.myName = '';
  setMyName('');
  fireToast('Seus dados foram apagados.');
  render();
}

async function copyToClipboard(target: HTMLElement, url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    const original = target.textContent;
    target.textContent = '✅ Copiado!';
    setTimeout(() => {
      target.textContent = original;
    }, 1600);
  } catch {
    fireToast(`Copie o link: ${url}`);
  }
}

async function clearQueue(): Promise<void> {
  const eventId = state.outbox[0]?.eventId;
  if (!eventId) return;
  await withBusy(async () => {
    await data.clearOutbox(eventId);
    state.outbox = [];
  });
}

async function submitRsvp(status: RsvpStatus): Promise<void> {
  const ev = state.event;
  if (!ev || !status) return;
  const nameInput = document.getElementById('guestNameInput') as HTMLInputElement | null;
  const phoneInput = document.getElementById('guestPhoneInput') as HTMLInputElement | null;
  const optInInput = document.getElementById('guestWaOptIn') as HTMLInputElement | null;

  const name = nameInput?.value.trim() ?? '';
  if (!name) {
    const err = document.getElementById('rsvpError');
    if (err) err.style.display = 'block';
    nameInput?.focus();
    return;
  }

  const rawPhone = phoneInput?.value.trim() ?? '';
  const phone = normalizePhoneBR(rawPhone);
  if (rawPhone && !phone) {
    const err = document.getElementById('phoneError');
    if (err) err.style.display = 'block';
    phoneInput?.focus();
    return;
  }
  // sem número não existe opt-in: o consentimento precisa de um destino
  const waOptIn = !!optInInput?.checked && !!phone;

  state.myName = name;
  setMyName(name);
  fireStamp(status);
  await withBusy(async () => {
    const result = await data.rsvp(ev.id, {
      name,
      status,
      phone,
      waOptIn,
      linkCode: state.linkCode,
      token: guestTokenFor(ev.id),
    });
    rememberGuestToken(ev.id, result.token, result.guestId);
    track('rsvp', { status }, ev.id);
  });
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
  fireToast(`🔔 Notificação enviada para ${ev.guests.length} convidado${ev.guests.length === 1 ? '' : 's'}!`);
}

function doorAmount(ev: EventRecord): number {
  const input = document.getElementById('doorAmount') as HTMLInputElement | null;
  const value = input ? parseFloat(input.value) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : ev.ticketPrice;
}

async function doCheckIn(guestId: string): Promise<void> {
  const ev = state.event;
  if (!ev) return;
  const amount = doorAmount(ev);
  await withBusy(() => data.checkIn(ev.id, guestId, amount));
}

async function walkIn(): Promise<void> {
  const ev = state.event;
  const name = state.doorSearch.trim();
  if (!ev || !name) return;
  const amount = doorAmount(ev);
  await withBusy(async () => {
    await data.rsvp(ev.id, { name, status: 'vou', linkCode: WALK_IN_CODE });
    const fresh = await data.getEvent(ev.id);
    const guest = fresh?.guests.find((g) => sameName(g.name, name));
    if (guest) await data.checkIn(ev.id, guest.id, amount);
  });
  state.doorSearch = '';
  render();
  fireToast(`${name} entrou 🎉`);
}

document.addEventListener('submit', (e) => {
  const form = e.target as HTMLElement;

  if (form.id === 'createForm') {
    e.preventDefault();
    const input = readCreateForm();
    if (!input) return;
    const editingId = state.route.name === 'edit' ? state.route.id : null;
    void (async () => {
      state.busy = true;
      state.error = null;
      render();
      try {
        if (editingId) {
          await data.updateEvent(editingId, input);
          state.busy = false;
          fireToast('Convite atualizado ✏️');
          navigate({ name: 'event', id: editingId, code: null });
        } else {
          const created = await data.createEvent(input);
          addKnownEvent(created.id);
          track('role_criado', { comIngresso: (input.ticketPrice ?? 0) > 0, produtora: !!input.orgId });
          state.busy = false;
          navigate({ name: 'event', id: created.id, code: null });
        }
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
    return;
  }

  if (form.id === 'orgForm') {
    e.preventDefault();
    const name = (document.getElementById('orgName') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!name) return;
    void (async () => {
      try {
        const org = await data.createOrg(name);
        state.orgId = org.id;
      } catch (err) {
        state.error = messageOf(err);
      }
      await loadPro();
    })();
    return;
  }

  if (form.id === 'promoterForm') {
    e.preventDefault();
    const orgId = state.orgId;
    const name = (document.getElementById('promoterName') as HTMLInputElement | null)?.value.trim() ?? '';
    const phone = normalizePhoneBR((document.getElementById('promoterPhone') as HTMLInputElement | null)?.value ?? '');
    const pct = parseFloat((document.getElementById('promoterCommission') as HTMLInputElement | null)?.value ?? '0');
    if (!orgId || !name) return;
    void withBusy(() => data.createPromoter(orgId, name, phone, Number.isFinite(pct) ? pct : 0).then(() => undefined));
    return;
  }

  if (form.id === 'linkForm') {
    e.preventDefault();
    const ev = state.event;
    const label = (document.getElementById('linkLabel') as HTMLInputElement | null)?.value.trim() ?? '';
    const promoterId = (document.getElementById('linkPromoter') as HTMLSelectElement | null)?.value || null;
    const maxRaw = (document.getElementById('linkMax') as HTMLInputElement | null)?.value ?? '';
    const maxUses = maxRaw ? parseInt(maxRaw, 10) : null;
    if (!ev || !label) return;
    void withBusy(() =>
      data.createGuestLink(ev.id, { label, promoterId, maxUses }).then(() => undefined),
    );
  }
});

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;

  if (el.id === 'photoInput') {
    const input = el as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const ev = state.event;
    if (!files.length || !ev) return;
    const uploader = state.myName || (ev.isHost && !state.guestMode ? 'Anfitrião' : 'Convidado');
    void withBusy(async () => {
      await data.addPhotos(ev.id, files, uploader);
      fireToast(`${files.length} foto${files.length === 1 ? '' : 's'} no álbum 📸`);
    });
    return;
  }

  if (el.id === 'campaignEvent') {
    state.campaignEventId = el.value;
    void loadPro();
    return;
  }

  if (el.id === 'campaignPromoter') {
    state.campaignPromoterId = el.value || null;
    render();
  }
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;

  if (el.id === 'doorSearch') {
    state.doorSearch = el.value;
    render();
    return;
  }
  if (el.id === 'audienceSearch') {
    state.audienceFilter = { ...state.audienceFilter, search: el.value };
    render();
    return;
  }
  if (el.id === 'audienceSize') {
    const size = parseInt(el.value, 10);
    state.audienceFilter = { ...state.audienceFilter, size: Number.isFinite(size) ? size : undefined };
    render();
  }
});

/* ===================== boot ===================== */

onRouteChange((route) => void loadRoute(route));

async function boot(): Promise<void> {
  state.backend = data.kind;
  initAnalytics(data);
  installErrorReporting();
  try {
    await data.init();
  } catch (err) {
    state.error = messageOf(err);
  }
  track('app_aberto', { backend: data.kind });

  // ?src=recap na URL prova que a instalação veio de um Recap compartilhado —
  // é a métrica que fecha o K-factor (docs/business-plan.md, seção 11)
  const src = new URLSearchParams(location.search).get('src');
  if (src) track('convite_aberto_via_recap', { src });

  await loadRoute(parseRoute());
}

void boot();
