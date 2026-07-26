import type { Db, StoredEvent, StoredOrg } from './local';
import type { GuestLink, Promoter, RsvpStatus, ThemeColor } from '../types';
import { shortCode, uid } from '../lib/format';
import { normalizePhoneBR } from '../lib/phone';

function isoDatePlus(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoTimeAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86400000).toISOString();
}

/** PRNG determinístico: o seed muda com o aparelho, mas é estável entre reloads. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function guest(
  name: string,
  status: RsvpStatus,
  extra: Partial<{
    phone: string | null;
    waOptIn: boolean;
    linkCode: string | null;
    checkedInAt: string | null;
    amountPaid: number;
  }> = {},
) {
  return {
    id: uid(),
    name,
    status,
    phone: extra.phone ?? null,
    waOptIn: extra.waOptIn ?? false,
    waOptInAt: extra.waOptIn ? isoTimeAgo(90) : null,
    linkCode: extra.linkCode ?? null,
    checkedInAt: extra.checkedInAt ?? null,
    amountPaid: extra.amountPaid ?? 0,
    docLast4: null,
  };
}

/* ===================== B2C: os dois rolês de exemplo ===================== */

function socialEvents(hostId: string): StoredEvent[] {
  const optChurrasco = [
    { id: uid(), text: 'Picanha' },
    { id: uid(), text: 'Linguiça' },
    { id: uid(), text: 'Frango' },
    { id: uid(), text: 'Costela' },
  ];

  return [
    {
      id: uid(),
      emoji: '🍖',
      title: 'Churrasco de Aniversário do Gabriel',
      date: isoDatePlus(19),
      time: '13:00',
      location: 'Cobertura — Vila Madalena, SP',
      description:
        'Bora comemorar mais um ano juntos! Eu garanto a carne e a caipirinha, só preciso saber quantas bocas vêm 😄 Traz quem quiser, casa é grande.',
      color: 'coral',
      pix: 'gabriel@pix.com.br',
      createdAt: isoTimeAgo(9),
      orgId: null,
      ticketPrice: 0,
      capacity: null,
      hostId,
      guests: [
        guest('Marina Costa', 'vou', { phone: normalizePhoneBR('11 98765-4321'), waOptIn: true }),
        guest('Lucas Andrade', 'vou', { phone: normalizePhoneBR('11 97654-3210'), waOptIn: true }),
        guest('Beatriz Lima', 'vou'),
        guest('João Pedro', 'talvez'),
        guest('Camila Reis', 'vou', { phone: normalizePhoneBR('11 96543-2109'), waOptIn: true }),
        guest('Rafael Souza', 'vou'),
        guest('Fernanda Dias', 'talvez'),
        guest('Thiago Melo', 'vou'),
        guest('Aline Rocha', 'nao'),
      ],
      mural: [
        {
          id: uid(),
          text: 'Confirmem até quinta-feira pra eu saber quanta carne comprar 🥩',
          createdAt: isoTimeAgo(2),
        },
        {
          id: uid(),
          text: 'Vai ter caipirinha de todo sabor, pode trazer sua fruta favorita se quiser!',
          createdAt: isoTimeAgo(5),
        },
      ],
      polls: [
        {
          id: uid(),
          question: 'Qual carne não pode faltar no churrasco?',
          options: optChurrasco,
          votes: {
            [optChurrasco[0].id]: ['Marina Costa', 'Lucas Andrade', 'Thiago Melo'],
            [optChurrasco[1].id]: ['Beatriz Lima'],
            [optChurrasco[2].id]: [],
            [optChurrasco[3].id]: ['Rafael Souza', 'Camila Reis'],
          },
          notified: true,
        },
      ],
      photos: [],
      links: [],
      // o caso clássico: cada um comprou uma coisa e ninguém sabe quem deve
      expenses: [
        {
          id: uid(),
          description: 'Carne (picanha, linguiça e costela)',
          amount: 320,
          paidBy: 'Gabriel',
          sharedWith: [],
          createdAt: isoTimeAgo(1),
        },
        {
          id: uid(),
          description: 'Cerveja e gelo',
          amount: 180,
          paidBy: 'Marina Costa',
          sharedWith: [],
          createdAt: isoTimeAgo(1),
        },
        {
          id: uid(),
          description: 'Carvão e descartáveis',
          amount: 76.5,
          paidBy: 'Lucas Andrade',
          sharedWith: [],
          createdAt: isoTimeAgo(1),
        },
      ],
    },
    {
      id: uid(),
      emoji: '🎉',
      title: 'Pré-Carnaval na Cobertura',
      date: isoDatePlus(-24),
      time: '17:00',
      location: 'Rooftop Edifício Aurora — Pinheiros, SP',
      description:
        'Esquenta antes do Carnaval com open bar de espumante, DJ set e vista pro pôr do sol. Vem fantasiado(a), o tema é "tropical neon" 🌴✨',
      color: 'purple',
      pix: '',
      createdAt: isoTimeAgo(40),
      orgId: null,
      ticketPrice: 0,
      capacity: null,
      hostId,
      guests: [
        guest('Pedro Nakamura', 'vou'),
        guest('Juliana Prado', 'vou'),
        guest('Bruno Ferreira', 'vou'),
        guest('Isabela Martins', 'vou'),
        guest('Diego Santos', 'talvez'),
      ],
      mural: [
        {
          id: uid(),
          text: 'Fantasia é obrigatória, mas pode ser só um detalhe tropical no look!',
          createdAt: isoTimeAgo(26),
        },
      ],
      polls: [],
      photos: [
        {
          id: uid(),
          url: null,
          placeholder: true,
          emoji: '🥂',
          caption: 'Brinde de boas-vindas',
          uploader: 'Pedro Nakamura',
          gradient: 'linear-gradient(135deg,#FF3B5C,#FFC94D)',
        },
        {
          id: uid(),
          url: null,
          placeholder: true,
          emoji: '🕺',
          caption: 'Pista lotada logo cedo',
          uploader: 'Juliana Prado',
          gradient: 'linear-gradient(135deg,#8B6FF0,#3FB8E0)',
        },
        {
          id: uid(),
          url: null,
          placeholder: true,
          emoji: '🌇',
          caption: 'Pôr do sol no rooftop',
          uploader: 'Bruno Ferreira',
          gradient: 'linear-gradient(135deg,#FF9F5A,#FF5A72)',
        },
      ],
      links: [],
    },
  ];
}

/* ===================== B2B: produtora com histórico ===================== */

type Archetype = 'vip' | 'fiel' | 'promissor' | 'risco' | 'dormente';

interface PoolPerson {
  name: string;
  type: Archetype;
}

const POOL: PoolPerson[] = [
  // VIPs — vão em quase tudo, gastam bem
  { name: 'Marina Costa', type: 'vip' },
  { name: 'Rafael Souza', type: 'vip' },
  { name: 'Camila Reis', type: 'vip' },
  { name: 'Pedro Nakamura', type: 'vip' },
  { name: 'Larissa Fontes', type: 'vip' },
  { name: 'Otávio Bandeira', type: 'vip' },
  { name: 'Nina Albuquerque', type: 'vip' },
  { name: 'Caio Vasconcelos', type: 'vip' },
  // Fiéis — presença constante, ticket médio
  { name: 'Lucas Andrade', type: 'fiel' },
  { name: 'Beatriz Lima', type: 'fiel' },
  { name: 'Juliana Prado', type: 'fiel' },
  { name: 'Bruno Ferreira', type: 'fiel' },
  { name: 'Isabela Martins', type: 'fiel' },
  { name: 'Thiago Melo', type: 'fiel' },
  { name: 'Renata Yoshida', type: 'fiel' },
  { name: 'Gustavo Paiva', type: 'fiel' },
  { name: 'Helena Braga', type: 'fiel' },
  { name: 'Vitor Camargo', type: 'fiel' },
  { name: 'Sofia Meireles', type: 'fiel' },
  { name: 'André Tavares', type: 'fiel' },
  // Promissores — chegaram agora
  { name: 'Manuela Ribas', type: 'promissor' },
  { name: 'Enzo Salgado', type: 'promissor' },
  { name: 'Clara Bonfim', type: 'promissor' },
  { name: 'Murilo Peçanha', type: 'promissor' },
  { name: 'Alice Guimarães', type: 'promissor' },
  { name: 'Théo Rangel', type: 'promissor' },
  { name: 'Lívia Mendonça', type: 'promissor' },
  { name: 'Iago Furtado', type: 'promissor' },
  // Em risco — confirmam e furam
  { name: 'Diego Santos', type: 'risco' },
  { name: 'Fernanda Dias', type: 'risco' },
  { name: 'João Pedro Alencar', type: 'risco' },
  { name: 'Priscila Nunes', type: 'risco' },
  { name: 'Wesley Aragão', type: 'risco' },
  { name: 'Tatiane Moura', type: 'risco' },
  // Dormentes — sumiram
  { name: 'Aline Rocha', type: 'dormente' },
  { name: 'Ricardo Pontes', type: 'dormente' },
  { name: 'Débora Vilela', type: 'dormente' },
  { name: 'Everton Sales', type: 'dormente' },
  { name: 'Paloma Cardoso', type: 'dormente' },
  { name: 'Sérgio Aquino', type: 'dormente' },
  { name: 'Bianca Teles', type: 'dormente' },
  { name: 'Rodrigo Bastos', type: 'dormente' },
  { name: 'Simone Vasques', type: 'dormente' },
];

interface ArchetypeCfg {
  inviteRate: number;
  confirmRate: number;
  showRate: number;
  spend: [number, number];
  /** Em quais rolês da série a pessoa aparece (0 = mais antigo). */
  window: (index: number, total: number) => boolean;
}

const ARCHETYPES: Record<Archetype, ArchetypeCfg> = {
  vip: { inviteRate: 0.95, confirmRate: 0.9, showRate: 0.92, spend: [90, 260], window: () => true },
  fiel: { inviteRate: 0.8, confirmRate: 0.75, showRate: 0.8, spend: [50, 130], window: () => true },
  promissor: {
    inviteRate: 0.9,
    confirmRate: 0.7,
    showRate: 0.7,
    spend: [40, 90],
    window: (i, total) => i >= total - 2,
  },
  risco: { inviteRate: 0.85, confirmRate: 0.85, showRate: 0.25, spend: [30, 70], window: () => true },
  dormente: {
    inviteRate: 0.9,
    confirmRate: 0.7,
    showRate: 0.7,
    spend: [40, 110],
    window: (i, _total) => i <= 1,
  },
};

interface ProSeed {
  org: StoredOrg;
  promoters: Promoter[];
  events: StoredEvent[];
}

function proOperation(hostId: string, rng: () => number): ProSeed {
  const org: StoredOrg = {
    id: uid(),
    name: 'Aurora Produções',
    createdAt: isoTimeAgo(400),
    ownerId: hostId,
  };

  const promoters: Promoter[] = [
    { id: uid(), orgId: org.id, name: 'Rafa Menezes', phone: normalizePhoneBR('11 99111-2233'), commissionPct: 10, active: true, createdAt: isoTimeAgo(380), publicToken: uid() },
    { id: uid(), orgId: org.id, name: 'Bibi Cortez', phone: normalizePhoneBR('11 99222-3344'), commissionPct: 12, active: true, createdAt: isoTimeAgo(300), publicToken: uid() },
    { id: uid(), orgId: org.id, name: 'Léo Duarte', phone: normalizePhoneBR('21 99333-4455'), commissionPct: 8, active: true, createdAt: isoTimeAgo(120), publicToken: uid() },
  ];

  const editions: { title: string; emoji: string; days: number; price: number; color: ThemeColor }[] = [
    { title: 'Aurora Rooftop — Edição Verão', emoji: '🌇', days: -196, price: 50, color: 'yellow' },
    { title: 'Aurora Rooftop — Baile Retrô', emoji: '🕺', days: -142, price: 60, color: 'purple' },
    { title: 'Aurora Rooftop — Open Deck', emoji: '🎧', days: -88, price: 60, color: 'green' },
    { title: 'Aurora Rooftop — Festa Junina Neon', emoji: '🔥', days: -47, price: 70, color: 'coral' },
    { title: 'Aurora Rooftop — Aniversário 2 Anos', emoji: '🎂', days: -16, price: 80, color: 'purple' },
  ];

  const phoneFor = (i: number) => normalizePhoneBR(`11 9${String(8000 + i).slice(0, 4)}-${String(1000 + i * 7).slice(0, 4)}`);
  const contactPhone = new Map<string, string | null>();
  const contactOptIn = new Map<string, boolean>();
  POOL.forEach((p, i) => {
    contactPhone.set(p.name, rng() < 0.82 ? phoneFor(i) : null);
    contactOptIn.set(p.name, rng() < 0.72);
  });

  const events: StoredEvent[] = editions.map((edition, index) => {
    const links: GuestLink[] = [
      { id: uid(), eventId: '', code: shortCode(), label: 'Rafa Menezes', promoterId: promoters[0].id, maxUses: null, opens: 0, createdAt: isoTimeAgo(-edition.days + 20), active: true },
      { id: uid(), eventId: '', code: shortCode(), label: 'Bibi Cortez', promoterId: promoters[1].id, maxUses: null, opens: 0, createdAt: isoTimeAgo(-edition.days + 20), active: true },
      { id: uid(), eventId: '', code: shortCode(), label: 'Lista da casa', promoterId: null, maxUses: null, opens: 0, createdAt: isoTimeAgo(-edition.days + 20), active: true },
    ];
    if (index >= 3) {
      links.splice(2, 0, {
        id: uid(),
        eventId: '',
        code: shortCode(),
        label: 'Léo Duarte',
        promoterId: promoters[2].id,
        maxUses: null,
        opens: 0,
        createdAt: isoTimeAgo(-edition.days + 20),
        active: true,
      });
    }

    const guests = POOL.flatMap((person) => {
      const cfg = ARCHETYPES[person.type];
      if (!cfg.window(index, editions.length)) return [];
      if (rng() > cfg.inviteRate) return [];

      const confirmed = rng() < cfg.confirmRate;
      const status: RsvpStatus = confirmed ? 'vou' : rng() < 0.55 ? 'talvez' : 'nao';
      const showed = confirmed && rng() < cfg.showRate;
      const [lo, hi] = cfg.spend;
      const amount = showed ? Math.round((lo + rng() * (hi - lo)) / 5) * 5 : 0;
      const link = links[Math.floor(rng() * links.length)];
      const attributed = rng() < 0.7;
      if (attributed) link.opens += 1;

      return [
        guest(person.name, status, {
          phone: contactPhone.get(person.name) ?? null,
          waOptIn: contactOptIn.get(person.name) ?? false,
          linkCode: attributed ? link.code : null,
          checkedInAt: showed ? isoTimeAgo(-edition.days) : null,
          amountPaid: amount,
        }),
      ];
    });

    // aberturas de link que não viraram confirmação — é isso que faz a conversão
    // do promoter não ser 100%
    links.forEach((l) => (l.opens += Math.floor(rng() * 14)));

    const id = uid();
    links.forEach((l) => (l.eventId = id));

    return {
      id,
      emoji: edition.emoji,
      title: edition.title,
      date: isoDatePlus(edition.days),
      time: '22:00',
      location: 'Rooftop Aurora — Rua Augusta, 2100, SP',
      description: 'Line-up de DJs residentes, vista aberta pra cidade e bar autoral até as 4h.',
      color: edition.color,
      pix: 'aurora@pix.com.br',
      createdAt: isoTimeAgo(-edition.days + 30),
      orgId: org.id,
      ticketPrice: edition.price,
      capacity: 300,
      hostId,
      guests,
      mural: [],
      polls: [],
      photos: [],
      links,
    };
  });

  // próxima edição: é pra ela que a campanha vai chamar a audiência
  const nextId = uid();
  const nextLinks: GuestLink[] = promoters.map((p) => ({
    id: uid(),
    eventId: nextId,
    code: shortCode(),
    label: p.name,
    promoterId: p.id,
    maxUses: null,
    opens: 0,
    createdAt: isoTimeAgo(3),
    active: true,
  }));
  nextLinks.push({
    id: uid(),
    eventId: nextId,
    code: shortCode(),
    label: 'Lista da casa',
    promoterId: null,
    maxUses: 150,
    opens: 0,
    createdAt: isoTimeAgo(3),
    active: true,
  });

  events.push({
    id: nextId,
    emoji: '✨',
    title: 'Aurora Rooftop — Réveillon Neon',
    date: isoDatePlus(23),
    time: '22:00',
    location: 'Rooftop Aurora — Rua Augusta, 2100, SP',
    description:
      'A maior edição do ano: três DJs, open de espumante na virada e vista pra cidade inteira.',
    color: 'coral',
    pix: 'aurora@pix.com.br',
    createdAt: isoTimeAgo(3),
    orgId: org.id,
    ticketPrice: 90,
    capacity: 300,
    hostId,
    guests: [],
    mural: [],
    polls: [],
    photos: [],
    links: nextLinks,
  });

  return { org, promoters, events };
}

/** Banco inicial: dois rolês pessoais + uma produtora com 6 edições de histórico. */
export function seedDb(hostId: string): Db {
  const rng = makeRng(0x9e3779b9);
  const pro = proOperation(hostId, rng);
  return {
    events: [...socialEvents(hostId), ...pro.events],
    orgs: [pro.org],
    promoters: pro.promoters,
    outbox: [],
    analytics: [],
  };
}
