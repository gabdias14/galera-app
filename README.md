# Galera 🎈

Convites de rolê com RSVP, enquete, mural, álbum pós-evento e **recap compartilhável** — um "Partiful brasileiro" —
mais o **Galera Pro**, a camada B2B para produtoras, casas e promoters.

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
    audience.ts         # B2B: score de público, tiers, projeção, promoters, portaria
    split.ts            # rateio do rolê: saldo por pessoa e quem paga quem
    plan.ts             # o que é grátis e o que é Pro (régua comercial num lugar só)
    messages.ts         # textos de campanha e lembrete de WhatsApp
    phone.ts            # telefone BR (E.164) e link do WhatsApp
    image.ts            # redimensiona foto antes de subir/guardar
    format.ts           # escapeHtml, avatares, comparação de nomes
  views/                # home, criação, evento, Galera Pro e portaria
  styles/main.css       # sistema visual (vermelho + papel, carimbo, ticket)
supabase/migrations/    # schema + RLS + storage (0001) e camada Pro (0002)
docs/                   # backend, B2B, WhatsApp, mobile, brief e os planos de negócio
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
- **A audiência do Pro sai só do dado próprio da produtora** — quem ela convidou, quem apareceu,
  quanto gastou. Nada de lista comprada. E campanha só vai pra quem deu opt-in explícito.

## Galera Pro (B2B)

Em `#/pro`, para quem faz festa como negócio:

- **Público** — cada pessoa da base ganha um score de 0 a 100 (receita, frequência, comparecimento,
  recência, indicações) e cai num tier: VIP, Fiel, Promissor, Em risco, Dormente.
- **Campanha** — escolhe o segmento e o rolê alvo; o app gera link rastreável, escreve mensagem
  personalizada por pessoa e projeta convites → presenças → receita antes de você mandar.
- **Links de convidados** — código curto por link (`#/e/<id>/c/<code>`), com aberturas, confirmados,
  presenças e receita por link.
- **Promoters** — comissão em % sobre a receita atribuída aos links dele, com conversão por promoter.
- **Portaria** — check-in por busca de nome, valor cobrado, walk-in e contador ao vivo de lotação e caixa.

Detalhes e a fórmula do score: [docs/b2b.md](docs/b2b.md).

## WhatsApp

Convidado marca "quero lembrete" no RSVP (opt-in explícito, com telefone validado). O anfitrião
prepara a fila e envia — o app abre o WhatsApp com o texto pronto, sem disparo automático.
O caminho pra API oficial, os templates e o custo estão em [docs/whatsapp.md](docs/whatsapp.md).

## Status do roadmap

| Fase | O quê | Status |
| --- | --- | --- |
| 0 | Protótipo navegável | ✅ |
| 1 | Backend real (schema, RLS, realtime, storage) | ✅ código pronto — falta criar o projeto no Supabase |
| 1.5 | Recap do rolê (1080×1920, Web Share) | ✅ |
| 1.6 | Galera Pro: público, campanha, links, promoters, portaria | ✅ |
| 1.7 | WhatsApp com opt-in (fila semiautomática) | ✅ — API oficial documentada, não implementada |
| 2 | Empacotar com Capacitor | ⏳ configurado, falta rodar num iPhone ([docs/mobile.md](docs/mobile.md)) |
| 3 | TestFlight | ⏳ |
| 4 | Submissão na App Store | ⏳ |

## Planejamento

- [docs/roadmap.md](docs/roadmap.md) — **o backlog vivo**: pesquisa com usuário, UX e backend
- [docs/contas-e-planos.md](docs/contas-e-planos.md) — identidade, assinatura e por que o convidado nunca faz conta
- [docs/melhorias.md](docs/melhorias.md) — backlog anterior, concluído (registro do que foi feito)
- [docs/business-plan.md](docs/business-plan.md) — modelo de receita, unit economics, concorrência e riscos
- [docs/marketing-plan.md](docs/marketing-plan.md) — plano de 90 dias, canais e redes sociais
- [docs/startup/](docs/startup/) — jurídico, captação, modelo financeiro e pitch deck

O que ainda **não** existe: projeto Supabase no ar (o código dos dois backends está pronto — é o item
que destrava todo o resto), push nativo, disparo automático de WhatsApp (hoje a fila é enviada com
confirmação humana — ver [docs/whatsapp.md](docs/whatsapp.md)), venda de ingresso com PIX
(implicação regulatória) e o webhook do provedor de pagamento que ativa a assinatura
(ver [docs/contas-e-planos.md](docs/contas-e-planos.md), seção 7).
