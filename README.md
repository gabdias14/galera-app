# Galera 🎈

Convites de rolê com RSVP, enquete, mural, álbum pós-evento e **recap compartilhável** — um "Partiful brasileiro".

> _"O WhatsApp organiza a conversa. O Galera organiza o rolê."_

O protótipo original (um HTML de arquivo único, com estado só na memória) virou um app de verdade:
TypeScript + Vite, roteamento por link de convite, camada de dados trocável (localStorage ou Supabase)
e o gerador de Recap 1080×1920 — a peça que faltava pro loop de crescimento.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
```

Sem variáveis de ambiente o app roda em **modo local**: tudo fica no `localStorage` do aparelho,
com dois rolês de exemplo (um futuro, um que já passou com o álbum liberado). Dá pra desenvolver
tudo assim — só não dá pra abrir o mesmo convite em dois aparelhos.

Pra dados reais e compartilhados, configure o Supabase: **[docs/backend.md](docs/backend.md)**.

```bash
npm run build      # typecheck + bundle em dist/
npm test           # testes das funções puras
npm run typecheck
```

## Como está organizado

```
src/
  main.ts               # controlador: render, delegação de eventos, ações
  state.ts              # estado do app + tema (cores, emojis)
  router.ts             # rotas em hash (#/e/<id>) e link do convite
  types.ts              # modelo de domínio + contrato DataAdapter
  data/
    index.ts            # escolhe o backend pelas env vars
    local.ts            # adaptador localStorage (padrão)
    supabase.ts         # adaptador Supabase (Postgres + Auth + Storage + Realtime)
    seed.ts             # rolês de exemplo do modo local
    identity.ts         # id do aparelho + nome do convidado
    known.ts            # rolês que este aparelho conhece
  lib/
    date.ts             # datas em pt-BR, "daqui a 3 dias", trava do álbum
    calendar.ts         # .ics e link do Google Agenda
    recap.ts            # gerador do Recap (canvas 1080×1920)
    image.ts            # redimensiona foto antes de subir/guardar
    format.ts           # escapeHtml, avatares, comparação de nomes
  views/                # home, criação e evento (anfitrião/convidado)
  styles/main.css       # sistema visual (vermelho + papel, carimbo, ticket)
supabase/migrations/    # schema + RLS + storage
docs/                   # backend, mobile e o brief do produto
legacy/                 # protótipo single-file original, pra referência
```

### Decisões que valem saber

- **O link é a chave.** O id do rolê é um uuid aleatório; quem tem o link vê o convite e responde.
  Não existe cadastro pra convidado — só o nome. É o mesmo modelo do Partiful e o que faz o convite
  circular no WhatsApp sem atrito.
- **Uma interface, dois backends.** `DataAdapter` (em `src/types.ts`) é implementado pelo localStorage
  e pelo Supabase. A UI não sabe qual está rodando; trocar é só colocar as env vars.
- **O app inteiro redesenha a cada mudança de estado** (o padrão do protótipo, mantido de propósito:
  é simples e rápido o bastante). O foco e o cursor dos inputs são preservados no redesenho.
- **A marca no Recap não sai.** É o motor de distribuição, não decoração — ver
  [docs/brief.md](docs/brief.md), seção 5.

## Status do roadmap

| Fase | O quê | Status |
| --- | --- | --- |
| 0 | Protótipo navegável | ✅ |
| 1 | Backend real (schema, RLS, realtime, storage) | ✅ código pronto — falta criar o projeto no Supabase |
| 1.5 | Recap do rolê (1080×1920, Web Share) | ✅ |
| 2 | Empacotar com Capacitor | ⏳ configurado, falta rodar num iPhone ([docs/mobile.md](docs/mobile.md)) |
| 3 | TestFlight | ⏳ |
| 4 | Submissão na App Store | ⏳ |

O que ainda **não** existe: notificação push de verdade (o botão "notificar convidados" marca a enquete
e avisa o anfitrião), edição/exclusão de rolê pela interface, e legenda nas fotos do álbum.
