# Galera — Roadmap

Julho/2026. Este documento sucede `docs/melhorias.md`, que foi **praticamente
esgotado**: dos 26 itens, 23 estão fechados no código. O que sobrou de lá está
na seção 0 abaixo.

Tamanhos seguem a convenção antiga: **P** (até 1 dia), **M** (2–5 dias),
**G** (mais de uma semana).

**A tese que organiza tudo:** o produto está pronto e o plano de negócio está
escrito, mas quase todo número que sustenta o plano está marcado
`[suposição]` no `business-plan.md`. A prioridade número um deste roadmap não é
construir mais — é **descobrir o que é verdade**. Código novo antes disso é
aposta com o próprio tempo.

---

## 0. O que ficou pendente do backlog anterior

| # | Item | Estado | Por quê |
| --- | --- | --- | --- |
| 1 | Projeto Supabase no ar | **Bloqueado em você** | O código dos dois backends está pronto e testado. Sem o projeto criado, dois celulares nunca veem o mesmo convite — e nenhuma pesquisa com usuário real é possível |
| 9 | Preview de link (Open Graph) por rolê | Meio-caminho | O card genérico funciona; a Edge Function de pré-render por evento está escrita em `supabase/functions/og`, falta o deploy (depende do item 1) |
| 15 | Venda de ingresso com PIX | Adiado de propósito | Receber em nome de terceiro tem implicação regulatória — ver `docs/startup/ideia-nfc-cashless.md`, que documenta o mesmo tipo de barreira |

**O item 1 é a única coisa nesta lista que trava todo o resto.** É uma tarde de
trabalho e destrava a fase inteira de pesquisa.

---

## 1. Pesquisa com usuário — o que precisa virar fato

Hoje o `business-plan.md` assume, sem medir: quantos convidados abrem um link,
qual fração gera Recap, qual fração compartilha, quantos pilotos viram
pagantes, se R$ 129/mês é preço aceitável. A instrumentação para medir já
existe (`src/lib/analytics.ts`), mas só produz dados quando houver rolê real.

### 1.1 Rodada zero: cinco rolês de verdade · P (uma semana de calendário)
Antes de qualquer entrevista formal, **use o app em cinco rolês seus**. Não é
teste — é uso. O objetivo é achar o que quebra quando a pessoa não é você.

O que anotar (caderno, não planilha): onde alguém perguntou "e agora?"; quantas
mensagens de WhatsApp você teve que mandar explicando; o que ninguém usou.

### 1.2 Entrevistas B2C — 8 a 12 pessoas · M
Não pergunte se gostaram. Pergunte sobre o **último rolê que a pessoa
organizou**, no passado, com detalhe:

- Como você combinou o último churrasco/aniversário? Me mostra a conversa.
- Em que momento você soube quantas pessoas iam? Como?
- Alguém pagou alguma coisa e ficou sem receber? O que aconteceu?
- Depois que acabou, você mandou foto pra alguém? Onde postou?

A quarta pergunta valida o Recap; a terceira valida a divisão de custos que
acabamos de construir. Se ninguém citar espontaneamente a dor que o produto
resolve, isso é o achado — não um problema da pergunta.

### 1.3 Entrevistas B2B — 20 conversas antes de escrever código novo · M
Já está prometido no `business-plan.md` seção 4 e no `marketing-plan.md`. O
roteiro de abordagem existe em `marketing-plan.md` §4. O que falta é o **guia da
conversa em si**:

- Quantos eventos você fez nos últimos 90 dias? (qualifica o perfil "1+/mês")
- Como você decide quem chamar pro próximo? Me mostra onde está essa lista.
- Quanto você paga hoje por promoter/mês? E por ferramenta?
- O que aconteceu na última vez que a casa ficou vazia numa terça?
- Se eu te desse uma lista de 40 pessoas com previsão de 28 presenças, isso
  mudaria alguma coisa? (testa a proposta do motor de audiência direto)

**Registre disposição a pagar sem perguntar preço:** pergunte o que gasta hoje.
Quem responde "R$ 800/mês num promoter" já respondeu sobre os R$ 129.

### 1.4 Teste de usabilidade moderado — 5 pessoas · P
Cinco pessoas é o número onde a curva de descoberta satura para problemas
graves. Tarefa única, cronometrada, sem ajuda: *"crie um convite para um
churrasco no sábado e me mande o link"*. Observe onde a pessoa hesita.

Rode isso **duas vezes**: antes e depois das mudanças da seção 2.

### 1.5 O painel que fecha o ciclo · M
Os eventos de produto já são gravados (`getFunnelStats` existe), mas ninguém os
lê. Falta uma tela — ou até um script que roda semanalmente — com as cinco
métricas da seção 11 do `business-plan.md`: K-factor, taxa de compartilhamento
do Recap, produtoras ativas, presenças atribuídas a campanha, retenção por
coorte.

**Critério de saída desta fase:** existir um número real de K-factor, mesmo que
ruim. O `business-plan.md` §11 já define o gatilho: abaixo de 0,5 por dois
trimestres, a tese de distribuição orgânica está errada e o plano vira venda
B2B direta. Esse é o tipo de decisão que só o dado permite.

---

## 2. UX — o que a pesquisa provavelmente vai confirmar

Listado por ordem de suspeita, do mais provável ao mais especulativo. **Não
construa tudo:** deixe a seção 1 dizer quais destes são reais.

### 2.1 O anfitrião não tinha como recuperar os próprios rolês · ✅ resolvido
A identidade do anfitrião era só uma sessão anônima do Supabase
(`signInAnonymously`) ou o id do aparelho no modo local. Limpar o navegador,
trocar de celular ou desinstalar o app apagava os rolês sem recuperação. Para o
convidado isso é aceitável (o link é a chave); para quem organiza, era perda de
dado do usuário.

→ **Feito**: `#/entrar` vincula a sessão anônima a um e-mail depois do fato
("salve seus rolês"), preservando o id do usuário — e portanto os rolês. A
decisão de "sem cadastro" para o convidado continua intacta. Ver
[contas-e-planos.md](contas-e-planos.md).

### 2.2 Estados vazios que não ensinam · P
A home cai direto no board; a aba Rachar diz "ninguém lançou nada ainda". Todo
estado vazio é uma chance de ensinar a próxima ação — hoje a maioria só informa.

### 2.3 O convidado não sabe o que fazer depois do RSVP · P
Confirmou presença e… fim. O momento pós-RSVP é o de maior atenção do
convidado, e é onde caberia: votar na enquete que existe, ver quem mais vai,
adicionar ao calendário. Parte disso está na tela, mas não como *próximo passo
sugerido*.

### 2.4 Divisão de custos: escolher quem racha · M
O modelo (`Expense.sharedWith`) e o cálculo já suportam grupo por despesa, mas a
interface sempre manda vazio (= todo mundo). O caso "só quem bebe racha a
cerveja" é o primeiro que alguém vai pedir.

### 2.5 Divisão de custos: marcar como pago · M
Hoje o app calcula quem deve, mas não registra que a dívida foi quitada. Sem
isso, o rateio nunca "fecha" e a tela fica mostrando dívida antiga pra sempre.
→ Um `settled_at` por transferência, ou um lançamento de acerto. Decidir depois
de ver gente usando: pode ser que o PIX resolva fora do app e ninguém queira
marcar nada.

### 2.6 Onboarding do organizador B2B · M
O convidado tem caminho claro; a produtora, não. Criar organização, primeiro
rolê Pro, primeiro promoter e primeiro link é uma sequência de quatro telas sem
guia. É a jornada que decide o piloto virar assinatura.

### 2.7 Revisão de acessibilidade de segunda passada · M
A primeira rodada (item 23 antigo) cobriu foco visível, `aria-live` e o
contraste do botão principal. Falta: navegação por teclado nos modais (Recap,
lightbox, scanner), `prefers-reduced-motion` nas animações de carimbo e toast, e
uma auditoria de contraste nos elementos novos — o rateio adiciona vários
badges coloridos sobre fundo vermelho.

### 2.8 Português do Brasil real, não português de software · P
Varredura de microcópia: mensagens de erro que explicam o que fazer, botões que
dizem o que acontece. O app já é bom nisso; é manutenção, não conserto.

---

## 3. Backend e plataforma

### 3.1 Rate limiting e abuso · M — **exposição real**
As policies do Supabase são generosas por desenho: qualquer um com o link
insere `guests`, `poll_votes`, `photos`, `product_events` e agora `expenses`.
Não há limite de taxa em nada disso. Um script trivial enche o banco de um rolê
— ou a conta de Storage inteira, via fotos.

→ Limite por IP na borda, tamanho e quantidade máxima por rolê nas policies, e
um teto de upload por evento. É o item que eu faria primeiro deste bloco.

### 3.2 Backup e recuperação · P
Não existe rotina de backup documentada nem teste de restauração. O Supabase faz
backup automático nos planos pagos, mas "existe backup" e "eu já restaurei um"
são coisas diferentes. Documentar e testar uma vez.

### 3.3 Retenção e ciclo de vida do dado · M
Nada nunca é apagado. Fotos de rolês de dois anos atrás ocupam Storage pago pra
sempre; `product_events` cresce sem limite. A LGPD também fala em não reter além
do necessário.
→ Política explícita (ex.: fotos por 12 meses, analytics agregado após 90 dias),
comunicada na página de privacidade que já existe.

### 3.4 Migrations testadas · M
Sete migrations e nenhuma roda em CI. Um banco Postgres efêmero no workflow
aplicando as migrations do zero pega erro de ordem e de sintaxe antes da
produção — especialmente relevante porque a 0007 (despesas) nunca rodou contra
um banco real.

### 3.5 Custo de Storage por foto · P
`downscaleImage` reduz para 1080px, mas não há teto de quantidade por rolê nem
por conta. O custo variável do plano (`business-plan.md` §7, "custo marginal por
conta ≈ R$ 15/mês") assume volume modesto de foto; um rolê com 500 fotos fura
essa conta.

### 3.6 WhatsApp: sair do semiautomático · G
Hoje o envio é confirmado por humano (documentado como decisão consciente em
`docs/whatsapp.md`). Funciona no piloto e não escala para dezenas de produtoras.
O caminho é a Cloud API via BSP, com webhook de opt-out — que também fecha a
promessa do "responda SAIR" que hoje depende de alguém ler a mensagem.

### 3.7 Observabilidade de verdade · P
`installErrorReporting` grava erro no próprio banco. Serve para o dia 1 e não
serve para diagnosticar produção: sem stack trace agregado, sem alerta, sem
saber que quebrou antes do usuário reclamar.

### 3.8 Testes de carga antes de vender casa grande · M
O item 24 antigo mediu o desenho da lista, não o banco. Antes de vender pra casa
de 1.000 pessoas, medir: `listEvents` com muitos ids, portaria com 1.000
convidados, campanha para 2.000 contatos.

---

## 4. Produto — as ideias grandes, e o que fazer com elas

As três ideias levantadas na conversa, com veredicto honesto:

| Ideia | Veredicto | Onde está documentada |
| --- | --- | --- |
| **Rachar a conta** | ✅ Feito, nativo | `src/lib/split.ts` — melhorias em 2.4 e 2.5 |
| **Integrar com marketplace (Sympla/Shotgun)** | Estudar depois de ter tração | Ver abaixo |
| **Cartão NFC / cashless** | Guardar como visão, não construir | `docs/startup/ideia-nfc-cashless.md` |

### Sobre a integração com marketplace
A ideia — "comprei ingresso no Sympla, divulgo pros meus amigos pelo Galera e
isso aparece pra quem se interessa" — é a mais alinhada à tese do produto de
todas as três: é literalmente o loop de distribuição, com um parceiro trazendo
o público.

O obstáculo não é técnico, é de poder de barganha. Uma integração dessas se
negocia com tração na mão, não com deck. O pré-requisito honesto é a seção 1
deste roadmap: chegar com "temos N produtoras e K-factor de X" muda a conversa
que "temos uma ideia boa". Deixe registrada como visão no pitch, procure depois
do marco do mês 6.

---

## 5. Sequência sugerida

**Fase 1 — destravar (semana 1)**
Item 0.1 (Supabase no ar). Sozinho. Nada mais desta lista importa antes.

**Fase 2 — descobrir (semanas 2–6)**
Seção 1 inteira: cinco rolês reais, entrevistas B2C e B2B, teste de usabilidade,
painel de métricas. Em paralelo, apenas os dois itens de risco que não dependem
de pesquisa: 2.1 (recuperar rolês) e 3.1 (rate limiting).

**Fase 3 — corrigir o que a pesquisa apontou (semanas 7–10)**
Escolher da seção 2 **só o que apareceu nas entrevistas**. A tentação vai ser
fazer a lista toda; a disciplina é fazer três coisas que alguém pediu.

**Fase 4 — endurecer para vender (semanas 11–14)**
3.2 a 3.5 e 2.6, quando o primeiro piloto B2B estiver perto de virar assinatura.

**Fase 5 — escala (a partir do mês 4)**
3.6 (WhatsApp oficial) e 3.8 (carga) quando houver volume que justifique.

---

## O erro que este roadmap existe pra evitar

O `business-plan.md` §10 já nomeia o risco: *"o risco real é dispersão: seguir a
ordem do backlog"*. Este documento tem quase 30 itens; nenhum deles importa mais
do que descobrir se as suposições do plano são verdadeiras. Se em três meses a
escolha for entre ter feito 20 itens desta lista ou ter 10 entrevistas e um
K-factor medido, a segunda opção ganha por larga margem.
