# Galera Pro (B2B)

A parte do produto que vende pra quem faz festa como negócio: produtora, casa, coletivo, promoter.
Fica em `#/pro` e usa os mesmos rolês do lado pessoal — a diferença é que eles pertencem a uma
**organização** e trazem preço de ingresso, lotação e links rastreáveis.

## O princípio: dado próprio, não lista comprada

Toda a audiência sai do que a própria produtora gerou — quem ela convidou, quem confirmou, quem
passou pela portaria e quanto gastou. Não existe importação de lista de terceiro, raspagem de rede
social nem enriquecimento externo.

Isso não é só conformidade com a LGPD (embora seja: base legal por consentimento, coletado no RSVP,
com carimbo de data). É o que faz a campanha funcionar — a pessoa reconhece quem está chamando.

## As quatro ferramentas

### 1. Público (segmentação por rentabilidade)

`src/lib/audience.ts` agrega os convidados de todas as edições numa base de contatos e dá a cada um
um **score de 0 a 100**:

| Peso | Sinal | Por quê |
| --- | --- | --- |
| 40 | Receita total (normalizada pelo p90 da base) | É a pergunta que o organizador faz: quem me dá dinheiro? |
| 25 | Frequência (presenças, satura em 5) | Quem sempre vem vale mais que quem veio muito uma vez |
| 20 | Taxa de comparecimento (presenças ÷ confirmações) | Separa quem aparece de quem só clica "vou" |
| 15 | Recência do último rolê | Público esfria; quem veio mês passado responde melhor |
| +5 | Indicações (pessoas que entraram pelo link dele) | Quem traz gente vale mais que o próprio ingresso |

O p90 em vez do máximo é de propósito: um único gasto fora da curva não achata a base inteira.

Daí saem cinco tiers, nessa ordem de prioridade:

- **Dormente** — sem aparecer há mais de 6 meses (ou nunca compareceu)
- **Em risco** — fura mais de 40% do que confirma, com ao menos 2 confirmações
- **VIP** — score ≥ 65
- **Fiel** — score ≥ 45
- **Promissor** — o resto

Dormente e Em risco vêm antes do score porque são **ações diferentes**: um pede campanha de resgate,
o outro pede overbooking ou cobrança antecipada — não convite comum.

### 2. Campanha ("chamar a galera")

Escolhe o rolê alvo, um promoter pra creditar e o filtro de público. O app:

1. gera **um link rastreável** da campanha;
2. escreve uma mensagem personalizada por pessoa (primeiro nome, rolê, data, preço, link);
3. enfileira tudo e mostra a **projeção**: convites → presenças previstas → receita prevista.

A previsão usa a taxa de comparecimento individual de cada pessoa (quem nunca confirmou entra com
35%, conservador) e o ticket médio histórico dela — não o preço cheio. É por isso que a projeção é
sempre menor que "gente × ingresso", e é isso que a torna útil.

**A campanha só monta mensagem pra quem autorizou WhatsApp.** Quem está no filtro mas não autorizou
aparece contado num aviso, pra ser alcançado pelo link público.

### 3. Links de convidados

Cada link tem código curto (`A7PG5N`), rótulo, dono opcional (promoter) e limite. A rota
`#/e/<id>/c/<code>` abre o mesmo convite e grava a origem em quem confirma. Com isso saem, por link:
aberturas, confirmados, presenças e receita.

O código usa alfabeto sem `0/O/1/I` — ele é lido e digitado por gente na porta da festa.

### 4. Promoters e portaria

**Promoters** têm comissão em % sobre a receita atribuída aos links deles. A tela mostra conversão
(confirmados ÷ aberturas), presenças e o valor da comissão — o suficiente pra fechar a conta no fim
da noite.

**Portaria** (`#/e/<id>/portaria`) é a tela de quem está na porta: busca por nome, botão grande de
entrada, valor cobrado editável, contador ao vivo de presentes/confirmados/caixa e % da lotação.
Quem não está na lista entra pelo botão de walk-in, que cadastra e dá entrada num gesto só — esses
ficam marcados com o código reservado `PORTARIA`, pra não inflarem a métrica de quem confirmou antes.

## Onde isso vive no código

```
src/lib/audience.ts    score, tiers, filtros, projeção, stats de promoter e portaria (tudo puro)
src/lib/messages.ts    textos de campanha e lembrete
src/lib/phone.ts       normalização de telefone BR e link do WhatsApp
src/views/pro.ts       painel, público + campanha, promoters
src/views/door.ts      portaria
supabase/migrations/0002_pro.sql
```

`audience.ts` não toca em DOM nem em rede: recebe `EventRecord[]` e devolve números. É o pedaço com
mais testes do projeto (`tests/audience.test.ts`).

## Privacidade no banco

A migration 0002 tira dado sensível da tabela que é pública por link:

- `guest_contacts` (telefone + consentimento) e `checkins` (presença + valor pago) são **tabelas
  separadas, visíveis só pro anfitrião** via RLS. A mesma query serve os dois papéis: pro convidado
  o array volta vazio.
- `guest_links` também é só do anfitrião — o convidado registra a abertura por uma função RPC
  (`register_link_open`), sem poder ler nem enumerar códigos.
- `outbox_messages` guarda telefone e por isso é host-only em todas as operações.

## O que ainda não existe

- Promoter **não tem login próprio** — ele recebe o link e o dono da produtora vê o desempenho.
  O caminho é `org_members` com papel, reaproveitando o `is_org_owner` já escrito.
- Sem QR code no check-in (a busca por nome cobre; QR entra quando a fila justificar).
- Sem cobrança de ingresso dentro do app: `amountPaid` é registrado na portaria, não processado.
- Preço, lotação e organização ainda não estão no formulário de criação — hoje chegam por seed ou
  API. Só a tela de criação precisa de campo; o modelo e o banco já aceitam.
