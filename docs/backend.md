# Backend (Supabase)

O app funciona sem backend nenhum (modo local, `localStorage`). Esta é a parte que faz o convite
abrir no celular da galera — a limitação #1 apontada no brief.

## 1. Criar o projeto

1. https://supabase.com → **New project** (região `South America (São Paulo)` — menos latência pro Brasil).
2. Anote a **Project URL** e a **anon public key** (Settings → API).
3. Em **Authentication → Providers → Anonymous sign-ins**: ative.
   O app cria uma sessão anônima no boot pra dar ao anfitrião uma identidade estável sem tela de login.
   Se estiver desativado, o app ainda roda, mas ninguém é reconhecido como anfitrião.

## 2. Rodar a migration

No **SQL Editor**, cole e execute `supabase/migrations/0001_init.sql`.

Ou, com a CLI:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

Isso cria as tabelas, as políticas de RLS, o bucket `event-photos` e adiciona tudo à publicação
do Realtime.

## 3. Ligar o app

```bash
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

O app detecta as variáveis e troca de adaptador sozinho — sem mudar código.
Confira no console: um rolê criado agora deve abrir numa janela anônima pelo mesmo link.

## Modelo de dados

```
events ──┬── guests            (RSVP: vou | talvez | nao)
         ├── mural_posts       (avisos do anfitrião)
         ├── polls ── poll_options ── poll_votes
         └── photos            (álbum, arquivos no bucket event-photos)
```

Detalhes que valem lembrar:

- `guests.name_key` e `poll_votes.voter_key` são **colunas geradas** (nome normalizado). São elas que
  seguram os índices únicos — é assim que "Ana Silva" e "ana silva" viram a mesma pessoa, e é o alvo
  do `upsert` no adaptador. Se mexer no nome dessas colunas, mexa também no `onConflict` em
  `src/data/supabase.ts`.
- `poll_options` e `poll_votes` carregam `event_id` desnormalizado de propósito: simplifica as políticas
  de RLS e permite filtrar o Realtime por rolê.
- `date` e `time` são separados e sem fuso. O app trata tudo como horário local do Brasil — é o que faz
  sentido pra uma festa ("sábado 20h" é 20h onde a festa acontece, não UTC).

## Modelo de acesso (e o que ele custa)

| Ação | Quem pode |
| --- | --- |
| Ver o rolê, convidados, enquetes, mural e álbum | Qualquer um com o link |
| Responder RSVP e votar | Qualquer um com o link |
| Postar no mural, criar enquete, apagar coisas | Só o anfitrião (`host_id = auth.uid()`) |
| Subir foto | Qualquer um com o link, **só a partir do dia do rolê** (checado no banco, não só na UI) |

**O trade-off consciente:** sem conta de convidado, o nome é a única identidade. Alguém com o link pode
alterar o RSVP de outra pessoa digitando o nome dela. É o mesmo nível de confiança de um grupo de
WhatsApp, e é o preço de não ter cadastro — que é justamente o que faz o RSVP converter.

Quando isso incomodar (provavelmente quando um rolê grande for sabotado), o caminho é **token por
convidado**: ao responder, o app gera um `guest_token` guardado no aparelho; a policy de `update` passa
a exigir `guest_token = current_setting('request.headers')::json->>'x-guest-token'`. Dá pra fazer sem
migrar dado nenhum — só adicionar coluna, preencher pra quem já respondeu e endurecer a policy depois.

## Fotos

Bucket `event-photos`, público pra leitura. As imagens são reduzidas no aparelho
(`src/lib/image.ts`, máx. 1440px, JPEG 78%) antes do upload — economiza banda do usuário e storage.

O Recap desenha as fotos num canvas e exporta PNG. Por isso as imagens são carregadas com
`crossOrigin="anonymous"`: sem CORS, o canvas fica "sujo" e o export quebra. O bucket público do
Supabase já responde com os cabeçalhos certos; se trocar de CDN, confira isso.

## Custo

O plano free do Supabase (500 MB de banco, 1 GB de storage, 2 GB de banda) segura tranquilo o
lançamento hiperlocal descrito no brief. O primeiro limite a estourar vai ser o storage do álbum —
por isso a compressão já está ligada.
