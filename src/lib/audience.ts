import type { EventRecord, Promoter } from '../types';
import { daysUntil, parseDate } from './date';
import { normalizeName } from './format';

/**
 * Motor de audiência do Galera Pro.
 *
 * Tudo aqui sai dos dados que a própria produtora gerou: quem foi convidada,
 * quem confirmou, quem apareceu na portaria e quanto gastou. Nenhuma lista
 * comprada, nenhum dado de terceiro — é o que torna a segmentação defensável
 * (LGPD) e, na prática, o que faz ela converter.
 */

export interface Contact {
  /** Nome normalizado — a chave de deduplicação entre eventos. */
  key: string;
  name: string;
  phone: string | null;
  waOptIn: boolean;
  /** Em quantos rolês entrou na lista. */
  invited: number;
  /** Em quantos confirmou presença. */
  confirmed: number;
  /** Em quantos passou pela portaria. */
  attended: number;
  /** Confirmou e não apareceu (só conta rolê que já aconteceu). */
  noShows: number;
  /** Total gasto (ingresso + consumação registrados no check-in). */
  revenue: number;
  /** Pessoas que entraram por um link desta pessoa. */
  referrals: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export type Tier = 'vip' | 'fiel' | 'promissor' | 'risco' | 'dormente';

export interface ScoredContact extends Contact {
  /** 0–100. */
  score: number;
  tier: Tier;
  /** Taxa de comparecimento sobre o que confirmou. */
  attendanceRate: number;
  /** Ticket médio por presença. */
  avgSpend: number;
  /** Frases prontas pra UI explicar por que a pessoa está nesse tier. */
  reasons: string[];
}

export const TIER_LABELS: Record<Tier, string> = {
  vip: 'VIP',
  fiel: 'Fiel',
  promissor: 'Promissor',
  risco: 'Em risco',
  dormente: 'Dormente',
};

export const TIER_COLORS: Record<Tier, string> = {
  vip: '#FFC94D',
  fiel: '#29D398',
  promissor: '#3FB8E0',
  risco: '#FF9F5A',
  dormente: 'rgba(255,255,255,.45)',
};

/** Agrega os convidados de todos os rolês da produtora numa base de contatos. */
export function buildContacts(events: EventRecord[], now: Date = new Date()): Contact[] {
  const byKey = new Map<string, Contact>();
  // dono do link -> quantas pessoas entraram por ele
  const referralsByLinkCode = new Map<string, number>();
  const linkOwnerName = new Map<string, string>();

  for (const ev of events) {
    for (const link of ev.links) {
      if (link.label) linkOwnerName.set(link.code, link.label);
    }
    for (const g of ev.guests) {
      if (g.linkCode) {
        referralsByLinkCode.set(g.linkCode, (referralsByLinkCode.get(g.linkCode) ?? 0) + 1);
      }
    }
  }

  const referralsByName = new Map<string, number>();
  for (const [code, count] of referralsByLinkCode) {
    const owner = linkOwnerName.get(code);
    if (!owner) continue;
    const key = normalizeName(owner);
    referralsByName.set(key, (referralsByName.get(key) ?? 0) + count);
  }

  for (const ev of events) {
    const past = daysUntil(ev.date, now) < 0;
    for (const g of ev.guests) {
      const key = normalizeName(g.name);
      if (!key) continue;
      const c: Contact = byKey.get(key) ?? {
        key,
        name: g.name,
        phone: null,
        waOptIn: false,
        invited: 0,
        confirmed: 0,
        attended: 0,
        noShows: 0,
        revenue: 0,
        referrals: 0,
        firstSeen: null,
        lastSeen: null,
      };

      c.invited += 1;
      if (g.status === 'vou') c.confirmed += 1;
      if (g.checkedInAt) c.attended += 1;
      else if (past && g.status === 'vou') c.noShows += 1;
      c.revenue += g.amountPaid || 0;
      if (g.phone) c.phone = g.phone;
      if (g.waOptIn) c.waOptIn = true;
      // o nome mais recente ganha: as pessoas corrigem a própria grafia
      c.name = g.name;

      if (!c.firstSeen || ev.date < c.firstSeen) c.firstSeen = ev.date;
      const relevant = g.checkedInAt ? ev.date : past && g.status === 'vou' ? ev.date : null;
      if (relevant && (!c.lastSeen || relevant > c.lastSeen)) c.lastSeen = relevant;

      byKey.set(key, c);
    }
  }

  for (const c of byKey.values()) {
    c.referrals = referralsByName.get(c.key) ?? 0;
  }

  return [...byKey.values()];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function daysSince(date: string | null, now: Date): number | null {
  if (!date) return null;
  return -daysUntil(date, now);
}

function recencyScore(days: number | null): number {
  if (days === null) return 0;
  if (days <= 30) return 1;
  if (days <= 90) return 0.7;
  if (days <= 180) return 0.4;
  if (days <= 365) return 0.15;
  return 0;
}

const MAX_FREQ = 5;

/**
 * Pontua e classifica a base. O peso maior é receita, porque a pergunta do
 * organizador é "quem me dá dinheiro?" — mas comparecimento pesa mais que
 * confirmação, senão quem só clica "vou" e some subiria no ranking.
 */
export function scoreContacts(contacts: Contact[], now: Date = new Date()): ScoredContact[] {
  const revenues = contacts.map((c) => c.revenue).sort((a, b) => a - b);
  // p90 em vez do máximo: um gasto fora da curva não achata a base inteira
  const revenueRef = Math.max(1, percentile(revenues, 0.9));

  return contacts
    .map((c) => {
      const attendanceRate = c.confirmed > 0 ? c.attended / c.confirmed : 0;
      const avgSpend = c.attended > 0 ? c.revenue / c.attended : 0;
      const since = daysSince(c.lastSeen, now);

      const revenuePart = Math.min(1, c.revenue / revenueRef) * 40;
      const freqPart = Math.min(1, c.attended / MAX_FREQ) * 25;
      const attendancePart = attendanceRate * 20;
      const recencyPart = recencyScore(since) * 15;
      const referralBonus = Math.min(5, c.referrals);
      const score = Math.round(
        Math.min(100, revenuePart + freqPart + attendancePart + recencyPart + referralBonus),
      );

      const noShowRate = c.confirmed > 0 ? c.noShows / c.confirmed : 0;
      let tier: Tier;
      if (!c.lastSeen || (since !== null && since > 180)) tier = 'dormente';
      else if (noShowRate > 0.4 && c.confirmed >= 2) tier = 'risco';
      else if (score >= 65) tier = 'vip';
      else if (score >= 45) tier = 'fiel';
      else tier = 'promissor';

      return { ...c, score, tier, attendanceRate, avgSpend, reasons: buildReasons(c, attendanceRate, since) };
    })
    .sort((a, b) => b.score - a.score || b.revenue - a.revenue);
}

function buildReasons(c: Contact, attendanceRate: number, since: number | null): string[] {
  const reasons: string[] = [];
  if (c.revenue > 0) {
    reasons.push(`R$ ${c.revenue.toFixed(0).replace('.', ',')} em ${c.attended} ${c.attended === 1 ? 'presença' : 'presenças'}`);
  }
  if (c.confirmed > 0) reasons.push(`compareceu em ${Math.round(attendanceRate * 100)}% do que confirmou`);
  if (c.referrals > 0) reasons.push(`trouxe ${c.referrals} ${c.referrals === 1 ? 'pessoa' : 'pessoas'}`);
  if (since !== null && since > 180) reasons.push(`sem aparecer há ${Math.round(since / 30)} meses`);
  else if (since !== null) reasons.push(`último rolê há ${since} dias`);
  if (c.noShows > 0) reasons.push(`${c.noShows} ${c.noShows === 1 ? 'furada' : 'furadas'}`);
  return reasons;
}

export interface AudienceFilter {
  tiers?: Tier[];
  /** Só quem autorizou WhatsApp — o padrão de qualquer campanha. */
  onlyOptIn?: boolean;
  minScore?: number;
  /** Quantas pessoas chamar. */
  size?: number;
  search?: string;
}

export function filterAudience(scored: ScoredContact[], filter: AudienceFilter = {}): ScoredContact[] {
  const term = filter.search ? normalizeName(filter.search) : '';
  let list = scored.filter((c) => {
    if (filter.tiers?.length && !filter.tiers.includes(c.tier)) return false;
    if (filter.onlyOptIn && !(c.waOptIn && c.phone)) return false;
    if (filter.minScore !== undefined && c.score < filter.minScore) return false;
    if (term && !c.key.includes(term)) return false;
    return true;
  });
  if (filter.size !== undefined) list = list.slice(0, filter.size);
  return list;
}

export interface AudienceProjection {
  people: number;
  /** Presenças esperadas, somando a probabilidade individual. */
  expectedAttendance: number;
  /** Receita esperada em reais. */
  expectedRevenue: number;
  /** Quantos dão pra chamar por WhatsApp agora. */
  reachableByWhatsApp: number;
}

/**
 * Projeta o resultado de chamar essa audiência. A probabilidade de cada pessoa
 * vem do histórico dela; quem nunca confirmou entra com uma taxa conservadora.
 */
export function projectAudience(selected: ScoredContact[], ticketPrice: number): AudienceProjection {
  let expectedAttendance = 0;
  let expectedRevenue = 0;

  for (const c of selected) {
    const base = c.confirmed > 0 ? c.attendanceRate : 0.35;
    const p = Math.min(0.95, Math.max(0.15, base));
    expectedAttendance += p;
    const spend = c.avgSpend > 0 ? c.avgSpend : ticketPrice;
    expectedRevenue += p * spend;
  }

  return {
    people: selected.length,
    expectedAttendance: Math.round(expectedAttendance),
    expectedRevenue: Math.round(expectedRevenue),
    reachableByWhatsApp: selected.filter((c) => c.waOptIn && c.phone).length,
  };
}

export interface PromoterStats {
  promoter: Promoter;
  links: number;
  opens: number;
  confirmed: number;
  attended: number;
  revenue: number;
  commission: number;
  /** Confirmações por abertura de link. */
  conversion: number;
}

/** Desempenho de cada promoter, atribuído pelos links dele. */
export function promoterStats(events: EventRecord[], promoters: Promoter[]): PromoterStats[] {
  return promoters
    .map((promoter) => {
      let links = 0;
      let opens = 0;
      let confirmed = 0;
      let attended = 0;
      let revenue = 0;

      for (const ev of events) {
        const codes = new Set(
          ev.links.filter((l) => l.promoterId === promoter.id).map((l) => l.code),
        );
        if (!codes.size) continue;
        links += codes.size;
        opens += ev.links.filter((l) => l.promoterId === promoter.id).reduce((s, l) => s + l.opens, 0);
        for (const g of ev.guests) {
          if (!g.linkCode || !codes.has(g.linkCode)) continue;
          if (g.status === 'vou') confirmed += 1;
          if (g.checkedInAt) attended += 1;
          revenue += g.amountPaid || 0;
        }
      }

      return {
        promoter,
        links,
        opens,
        confirmed,
        attended,
        revenue,
        commission: Math.round(revenue * (promoter.commissionPct / 100) * 100) / 100,
        conversion: opens > 0 ? confirmed / opens : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.attended - a.attended);
}

/** Código reservado: quem foi cadastrado na própria portaria. */
export const WALK_IN_CODE = 'PORTARIA';

export interface DoorStats {
  confirmed: number;
  present: number;
  maybe: number;
  walkIns: number;
  revenue: number;
  capacity: number | null;
}

/** Números da portaria em tempo real. */
export function doorStats(ev: EventRecord): DoorStats {
  const confirmed = ev.guests.filter((g) => g.status === 'vou').length;
  const present = ev.guests.filter((g) => !!g.checkedInAt).length;
  return {
    confirmed,
    present,
    maybe: ev.guests.filter((g) => g.status === 'talvez').length,
    walkIns: ev.guests.filter(
      (g) => !!g.checkedInAt && (g.status !== 'vou' || g.linkCode === WALK_IN_CODE),
    ).length,
    revenue: ev.guests.reduce((s, g) => s + (g.amountPaid || 0), 0),
    capacity: ev.capacity,
  };
}

/** Receita de um rolê, usada no painel da produtora. */
export function eventRevenue(ev: EventRecord): number {
  return ev.guests.reduce((sum, g) => sum + (g.amountPaid || 0), 0);
}

export function isPastEvent(ev: EventRecord, now: Date = new Date()): boolean {
  return parseDate(ev.date).getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
