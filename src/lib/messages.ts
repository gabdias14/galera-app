import type { EventRecord } from '../types';
import { longDate, relativeDays } from './date';

/** Primeiro nome, pra mensagem não soar robótica. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function when(ev: EventRecord): string {
  return `${longDate(ev.date)} às ${ev.time}`;
}

/** Convite de campanha: o texto que o promoter dispara pra audiência escolhida. */
export function campaignMessage(name: string, ev: EventRecord, link: string): string {
  const preco = ev.ticketPrice > 0 ? `\nEntrada: R$ ${formatMoney(ev.ticketPrice)}` : '';
  return (
    `E aí, ${firstName(name)}! ${ev.emoji}\n\n` +
    `Rolou de montar o *${ev.title}* — ${when(ev)}, no ${ev.location}.` +
    preco +
    `\n\nSeparei um convite seu, é só confirmar aqui:\n${link}\n\n` +
    `_Você recebeu porque autorizou avisos no WhatsApp. Responda SAIR pra não receber mais._`
  );
}

/** Lembrete do rolê pra quem já confirmou (B2C). */
export function reminderMessage(name: string, ev: EventRecord, link: string): string {
  return (
    `Oi, ${firstName(name)}! ${ev.emoji}\n\n` +
    `Passando pra lembrar: *${ev.title}* ${relativeDays(ev.date)} — ${when(ev)}.\n` +
    `📍 ${ev.location}\n\n` +
    `Detalhes e álbum do rolê: ${link}\n\n` +
    `_Você autorizou lembretes no WhatsApp. Responda SAIR pra parar._`
  );
}

/** Aviso do mural virando mensagem. */
export function muralMessage(name: string, ev: EventRecord, text: string, link: string): string {
  return (
    `Oi, ${firstName(name)}! Recado do *${ev.title}*:\n\n` +
    `${text}\n\n${link}\n\n` +
    `_Você autorizou avisos no WhatsApp. Responda SAIR pra parar._`
  );
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMoneyShort(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}
