import type { EventRecord } from '../types';
import { daysUntil, longDate } from './date';
import { initials, avatarColor, plural } from './format';
import { loadImage } from './image';

export const RECAP_W = 1080;
export const RECAP_H = 1920;

export interface RecapPollResult {
  question: string;
  optionText: string;
  pct: number;
  votes: number;
}

export interface RecapData {
  emoji: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  description: string;
  headline: string;
  confirmedCount: number;
  maybeCount: number;
  guestNames: string[];
  topPoll: RecapPollResult | null;
  photoUrls: string[];
  isPast: boolean;
}

/**
 * Agrega o rolê no que cabe numa imagem de Stories.
 * Função pura — é o miolo testável do Recap.
 */
export function buildRecapData(ev: EventRecord, now: Date = new Date()): RecapData {
  const confirmed = ev.guests.filter((g) => g.status === 'vou');
  const maybe = ev.guests.filter((g) => g.status === 'talvez');
  const isPast = daysUntil(ev.date, now) < 0;

  let topPoll: RecapPollResult | null = null;
  for (const poll of ev.polls) {
    const total = Object.values(poll.votes).reduce((sum, v) => sum + v.length, 0);
    if (total === 0) continue;
    let bestId = poll.options[0]?.id;
    let bestCount = -1;
    for (const opt of poll.options) {
      const count = poll.votes[opt.id]?.length ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestId = opt.id;
      }
    }
    const winner = poll.options.find((o) => o.id === bestId);
    if (!winner) continue;
    topPoll = {
      question: poll.question,
      optionText: winner.text,
      pct: Math.round((bestCount / total) * 100),
      votes: bestCount,
    };
    break;
  }

  return {
    emoji: ev.emoji,
    title: ev.title,
    dateLabel: longDate(ev.date),
    timeLabel: ev.time,
    location: ev.location,
    description: ev.description,
    headline: isPast ? 'que rolê!' : 'tá marcado!',
    confirmedCount: confirmed.length,
    maybeCount: maybe.length,
    guestNames: confirmed.slice(0, 12).map((g) => g.name),
    topPoll,
    photoUrls: ev.photos.filter((p) => !!p.url).slice(0, 6).map((p) => p.url as string),
    isPast,
  };
}

const FONT_TITLE = 'Bricolage Grotesque';
const FONT_BODY = 'Work Sans';
const FONT_MONO = 'Space Mono';
const FONT_LOGO = 'Pacifico';

/** Espera as fontes da marca antes de desenhar (senão o canvas cai no fallback). */
export async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const faces = [
    `800 96px "${FONT_TITLE}"`,
    `700 40px "${FONT_BODY}"`,
    `700 34px "${FONT_MONO}"`,
    `400 64px "${FONT_LOGO}"`,
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => undefined)));
  await document.fonts.ready;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth || words.join(' ').length > lines.join(' ').length) {
      let truncated = last;
      while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      if (words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = `${truncated.trim()}…`;
    }
  }
  return lines;
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, RECAP_W * 0.4, RECAP_H);
  grad.addColorStop(0, '#FF3B5C');
  grad.addColorStop(0.55, '#E0163B');
  grad.addColorStop(1, '#970F30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);

  const glow = ctx.createRadialGradient(140, 40, 0, 140, 40, 720);
  glow.addColorStop(0, 'rgba(255,255,255,.22)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);

  const warm = ctx.createRadialGradient(RECAP_W, 320, 0, RECAP_W, 320, 700);
  warm.addColorStop(0, 'rgba(255,214,140,.22)');
  warm.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);

  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let y = 30; y < RECAP_H; y += 44) {
    for (let x = 30; x < RECAP_W; x += 44) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLogo(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFCF9';
  ctx.font = `400 64px "${FONT_LOGO}", cursive`;
  ctx.fillText('galera', RECAP_W / 2, y);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const sw = 170;
  const sx = RECAP_W / 2 - sw / 2;
  ctx.moveTo(sx, y + 22);
  for (let i = 0; i < 4; i++) {
    ctx.quadraticCurveTo(sx + sw * (i / 4 + 0.125), y + (i % 2 === 0 ? 8 : 36), sx + sw * ((i + 1) / 4), y + 22);
  }
  ctx.stroke();
}

function drawAvatars(ctx: CanvasRenderingContext2D, names: string[], centerY: number): void {
  if (!names.length) return;
  const r = 46;
  const gap = 18;
  const perRow = Math.min(names.length, 6);
  const rowWidth = perRow * (r * 2) + (perRow - 1) * gap;
  let startX = (RECAP_W - rowWidth) / 2 + r;
  let x = startX;
  let y = centerY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  names.forEach((name, i) => {
    if (i > 0 && i % 6 === 0) {
      const remaining = Math.min(names.length - i, 6);
      const w = remaining * (r * 2) + (remaining - 1) * gap;
      startX = (RECAP_W - w) / 2 + r;
      x = startX;
      y += r * 2 + gap;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = avatarColor(name);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,252,249,.9)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `800 34px "${FONT_BODY}", sans-serif`;
    ctx.fillText(initials(name), x, y + 2);
    x += r * 2 + gap;
  });
  ctx.textBaseline = 'alphabetic';
}

function drawPhotoMosaic(ctx: CanvasRenderingContext2D, images: HTMLImageElement[], top: number, height: number): void {
  if (!images.length) return;
  const cols = images.length <= 2 ? images.length : 3;
  const rows = Math.ceil(images.length / cols);
  const gap = 16;
  const margin = 90;
  const cellW = (RECAP_W - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = Math.min(cellW, (height - gap * (rows - 1)) / rows);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cellW + gap);
    const y = top + row * (cellH + gap);
    ctx.save();
    roundRect(ctx, x, y, cellW, cellH, 26);
    ctx.clip();
    const scale = Math.max(cellW / img.width, cellH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
    ctx.restore();
  });
}

/** Cartão de papel com o recado do anfitrião — usado quando o rolê ainda não tem fotos. */
function drawQuoteCard(ctx: CanvasRenderingContext2D, text: string, top: number, maxHeight: number): void {
  const margin = 90;
  const width = RECAP_W - margin * 2;
  const lineHeight = 48;

  ctx.font = `500 36px "${FONT_BODY}", sans-serif`;
  const maxLines = Math.max(1, Math.min(5, Math.floor((maxHeight - 104) / lineHeight)));
  const lines = wrapText(ctx, text, width - 100, maxLines);
  const height = lines.length * lineHeight + 92;

  ctx.fillStyle = '#FFFCF9';
  roundRect(ctx, margin, top, width, height, 30);
  ctx.fill();

  // aba perfurada, igual à do convite
  ctx.strokeStyle = 'rgba(27,16,48,.16)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(margin + 30, top + 54);
  ctx.lineTo(margin + width - 30, top + 54);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#1B1030';
  ctx.textAlign = 'center';
  let ty = top + 108;
  lines.forEach((line) => {
    ctx.fillText(line, RECAP_W / 2, ty);
    ty += lineHeight;
  });
}

/**
 * Desenha o Recap 1080×1920 pronto pro Stories.
 * A marca do Galera no rodapé é parte do motor de crescimento — não removível.
 */
export async function renderRecap(data: RecapData): Promise<HTMLCanvasElement> {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = RECAP_W;
  canvas.height = RECAP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível neste aparelho');

  drawBackground(ctx);
  drawLogo(ctx, 130);

  ctx.textAlign = 'center';

  // headline + emoji
  ctx.font = `700 34px "${FONT_MONO}", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(data.headline.toUpperCase(), RECAP_W / 2, 250);

  ctx.font = '160px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.fillText(data.emoji, RECAP_W / 2, 420);

  // título
  ctx.fillStyle = '#FFFCF9';
  ctx.font = `800 82px "${FONT_TITLE}", sans-serif`;
  const titleLines = wrapText(ctx, data.title, RECAP_W - 160, 3);
  let y = 540;
  titleLines.forEach((line) => {
    ctx.fillText(line, RECAP_W / 2, y);
    y += 94;
  });

  // data e local
  ctx.font = `700 36px "${FONT_MONO}", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fillText(`${data.dateLabel} · ${data.timeLabel}`, RECAP_W / 2, y + 10);
  y += 60;
  ctx.font = `500 34px "${FONT_BODY}", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  wrapText(ctx, data.location, RECAP_W - 200, 1).forEach((line) => {
    ctx.fillText(line, RECAP_W / 2, y + 10);
    y += 48;
  });

  // contador de confirmados
  y += 60;
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  roundRect(ctx, 90, y, RECAP_W - 180, 210, 34);
  ctx.fill();
  ctx.fillStyle = '#FFFCF9';
  ctx.font = `800 120px "${FONT_TITLE}", sans-serif`;
  ctx.fillText(String(data.confirmedCount), RECAP_W / 2, y + 130);
  ctx.font = `700 34px "${FONT_MONO}", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  const counterLabel = data.isPast
    ? `${plural(data.confirmedCount, 'PESSOA', 'PESSOAS')} NO ROLÊ`
    : `${plural(data.confirmedCount, 'CONFIRMADO', 'CONFIRMADOS')}` +
      (data.maybeCount ? ` · ${data.maybeCount} TALVEZ` : '');
  ctx.fillText(counterLabel, RECAP_W / 2, y + 178);
  y += 232;

  // mosaico de avatares
  drawAvatars(ctx, data.guestNames, y + 46);
  y += Math.ceil(Math.min(data.guestNames.length, 12) / 6) * 110 + (data.guestNames.length ? 20 : 0);

  // enquete campeã
  if (data.topPoll) {
    y += 22;
    const boxH = 200;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    roundRect(ctx, 90, y, RECAP_W - 180, boxH, 30);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = `600 32px "${FONT_BODY}", sans-serif`;
    wrapText(ctx, data.topPoll.question, RECAP_W - 260, 1).forEach((line) =>
      ctx.fillText(line, RECAP_W / 2, y + 58),
    );

    const barX = 130;
    const barW = RECAP_W - 260;
    const barY = y + 92;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    roundRect(ctx, barX, barY, barW, 74, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(41,211,152,.72)';
    roundRect(ctx, barX, barY, Math.max(90, (barW * data.topPoll.pct) / 100), 74, 20);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFCF9';
    ctx.font = `800 36px "${FONT_BODY}", sans-serif`;
    ctx.fillText(data.topPoll.optionText, barX + 28, barY + 48);
    ctx.textAlign = 'right';
    ctx.font = `700 34px "${FONT_MONO}", monospace`;
    ctx.fillText(`${data.topPoll.pct}%`, barX + barW - 28, barY + 48);
    ctx.textAlign = 'center';
    y += boxH + 20;
  }

  // fotos
  const images: HTMLImageElement[] = [];
  for (const url of data.photoUrls) {
    try {
      images.push(await loadImage(url, 'anonymous'));
    } catch {
      /* foto sem CORS: ignora pra não sujar o canvas e quebrar o export */
    }
  }
  const mosaicTop = y + 24;
  // 1730 é onde o rodapé da marca começa a respirar
  const mosaicSpace = RECAP_H - 190 - mosaicTop;
  if (images.length && mosaicSpace > 160) {
    drawPhotoMosaic(ctx, images, mosaicTop, mosaicSpace);
  } else if (data.description && mosaicSpace > 170) {
    // Sem fotos, o recado do convite ocupa o espaço — em cartão de papel, como o convite.
    drawQuoteCard(ctx, data.description, mosaicTop, mosaicSpace);
  }

  // rodapé — marca (motor de crescimento, não decoração)
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  roundRect(ctx, RECAP_W / 2 - 250, RECAP_H - 168, 500, 96, 48);
  ctx.fill();
  ctx.fillStyle = '#FFFCF9';
  ctx.font = `400 46px "${FONT_LOGO}", cursive`;
  ctx.fillText('galera', RECAP_W / 2 - 78, RECAP_H - 104);
  ctx.font = `600 30px "${FONT_BODY}", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText('crie o seu rolê', RECAP_W / 2 + 100, RECAP_H - 104);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png');
  });
}

export function recapFileName(title: string): string {
  const slug = title
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `recap-${slug || 'role'}.png`;
}
