import type { RsvpStatus } from '../types';
import { escapeHtml } from '../lib/format';

export function fireToast(message: string): void {
  const layer = document.createElement('div');
  layer.className = 'toast-layer';
  // role="status" faz o leitor de tela anunciar sozinho — sem isso o toast é
  // só visual e some antes de alguém navegar até ele (item #23 do backlog)
  layer.innerHTML = `<div class="toast" role="status" aria-live="polite">${escapeHtml(message)}</div>`;
  document.body.appendChild(layer);
  setTimeout(() => {
    layer.classList.add('is-fading');
    setTimeout(() => layer.remove(), 320);
  }, 2400);
}

const STAMPS: Record<RsvpStatus, { text: string; color: string }> = {
  vou: { text: 'Confirmado! 🎉', color: '#1BAE7F' },
  talvez: { text: 'Anotado! 🤔', color: '#E3A916' },
  nao: { text: 'Combinado 😢', color: '#8677AE' },
};

/** Carimbo de tinta + confete — a assinatura do RSVP. */
export function fireStamp(status: RsvpStatus): void {
  const config = STAMPS[status];
  const layer = document.createElement('div');
  layer.className = 'stamp-layer';
  layer.innerHTML = `<div class="stamp" role="status" style="color:${config.color}">${config.text}</div>`;
  document.body.appendChild(layer);

  if (status === 'vou') fireConfetti();

  setTimeout(() => {
    layer.classList.add('is-fading');
    setTimeout(() => layer.remove(), 380);
  }, 900);
}

export function fireConfetti(count = 14): void {
  const colors = ['#FF5A72', '#FFC94D', '#29D398', '#8B6FF0', '#3FB8E0'];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('div');
    bit.className = 'confetti-bit';
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 160;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    bit.style.background = colors[i % colors.length];
    bit.style.transition = 'transform .8s cubic-bezier(.2,.8,.3,1), opacity .8s ease';
    document.body.appendChild(bit);
    requestAnimationFrame(() => {
      bit.style.transform = `translate(${tx}px,${ty}px) rotate(${Math.random() * 400 - 200}deg)`;
      bit.style.opacity = '0';
    });
    setTimeout(() => bit.remove(), 850);
  }
}
