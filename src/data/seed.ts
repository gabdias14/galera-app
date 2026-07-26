import type { StoredEvent } from './local';
import { uid } from '../lib/format';
import type { RsvpStatus } from '../types';

function isoDatePlus(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoTimeAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86400000).toISOString();
}

function guest(name: string, status: RsvpStatus) {
  return { id: uid(), name, status };
}

/**
 * Dois rolês de exemplo pra primeira execução: um no futuro (RSVP + enquete aberta)
 * e um que já passou (álbum liberado). As datas são relativas a hoje.
 */
export function seedEvents(hostId: string): StoredEvent[] {
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
      hostId,
      guests: [
        guest('Marina Costa', 'vou'),
        guest('Lucas Andrade', 'vou'),
        guest('Beatriz Lima', 'vou'),
        guest('João Pedro', 'talvez'),
        guest('Camila Reis', 'vou'),
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
    },
  ];
}
