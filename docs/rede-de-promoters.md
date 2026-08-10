# Rede de promoters — ranking, perfil e feed

Ideia levantada em conversa: **produtoras verem um ranking geral dos melhores
promoters, e poderem contratar pela plataforma; e o promoter ter um feed com
fotos e notas dos rolês, tipo Strava.**

Este documento é o estudo dessa ideia: o que ela tem de forte, o que quebra se
for feita do jeito óbvio, e o desenho que funciona.

---

## 1. Por que a ideia é forte — e mais forte do que parece

O ranking é a parte visível. O que está por baixo é maior:

**O promoter é um canal de distribuição ambulante.** Ele não é fiel a uma casa
— trabalha em várias, muda de casa, leva o público junto. Se a ferramenta mora
com *ele*, ela entra em cada casa onde ele trabalhar, de baixo pra cima, sem
venda. É exatamente o mesmo movimento que o Recap faz no B2C: alguém que não é
o cliente carrega o produto pra dentro.

Hoje o plano de aquisição B2B do `marketing-plan.md` é venda direta, um a um,
com CAC de R$ 400–800 previsto no `business-plan.md`. Um promoter que chega numa
casa nova dizendo *"eu trabalho com Galera, meu histórico está aqui"* é aquisição
com CAC perto de zero.

**E é defensável.** Um concorrente copia a tela de portaria numa semana. Não
copia dois anos de histórico de desempenho de 500 promoters.

Isso é mais estratégico do que qualquer coisa no roadmap atual. Vale levar a
sério — e é justamente por valer que os problemas abaixo precisam ser
resolvidos, não contornados.

---

## 2. O problema que mata a versão óbvia

**Os números do promoter são, em grande parte, dados da produtora.**

Hoje `promoterStats` (`src/lib/audience.ts`) calcula em cima dos eventos da
própria org: quantos confirmaram, quantos foram, **quanta receita entrou**. E
todo o RLS é escopado por `is_org_owner` — nenhuma produtora enxerga nada da
outra, por desenho.

Publicar isso num ranking entre produtoras significa: a Produtora A descobre
que o promoter da Produtora B trouxe 300 pessoas e R$ 40 mil. Isso não é dado do
promoter — **é o faturamento da B**.

Três consequências:

1. **Contradiz o argumento que vende o produto.** O README e o pitch dizem "a
   audiência sai só do dado próprio da produtora, nada de lista comprada". Um
   ranking que expõe esse dado desmonta a frase que fecha a venda.
2. **LGPD.** O promoter é pessoa física; a produtora é controladora e o Galera é
   operador (`business-plan.md` §10). Reaproveitar o dado da controladora pra uma
   finalidade nova — marketplace público — exige base legal nova e consentimento.
   Operador não decide finalidade sozinho.
3. **A comissão entrega a receita mesmo sem publicar a receita.** Comissão é uma
   % da receita. Se o ranking mostrar "R$ 3.200 de comissão" e o mercado souber
   que a praxe é 10%, qualquer um inverte a conta e chega no faturamento. Não
   basta esconder a coluna de receita.

### O paradoxo da caça-talentos

Este é o menos óbvio e o mais perigoso:

**Quem paga a assinatura é a produtora. O ranking serve ao promoter e à
produtora que está contratando — à custa da produtora que já tem aquele
promoter.**

Ou seja: o produto cobraria da Produtora A pra ajudar a Produtora B a roubar o
melhor promoter da A. Quando isso acontecer uma vez, a A cancela — e vai contar
pra todo mundo por quê. Numa base de 25 produtoras (o cenário base do plano),
duas ou três histórias dessas afundam a reputação comercial.

Isso não inviabiliza a ideia. Mas significa que **a produtora incumbente precisa
ganhar alguma coisa também**, senão o desenho é extrativo com quem paga.

---

## 3. O desenho que funciona

A analogia do Strava é o que destrava — e provavelmente foi por isso que ela
surgiu junto.

**No Strava, a atividade é do atleta.** Ele correu, o dado é dele, ele escolhe
publicar. O ranking existe porque cada pessoa trouxe o próprio dado.

Traduzindo pro Galera:

### 3.1 O promoter é dono do próprio perfil, e opta por entrar

Não é a produtora que publica o promoter no ranking — é o promoter que ativa o
próprio perfil público. Ele já tem uma página sem login (`#/promoter/<token>`,
feita no Lote D); ela vira a base.

Isso resolve o consentimento do lado da pessoa física e inverte a relação: o
dado passa a ser publicado por quem ele descreve.

### 3.2 Publicar taxas, não dinheiro

| Métrica | De quem é | Pode ser pública? |
| --- | --- | --- |
| Taxa de conversão (abriu → confirmou) | do promoter — é a habilidade dele | ✅ |
| Taxa de comparecimento (confirmou → foi) | do promoter | ✅ |
| Nº de rolês trabalhados | do promoter | ✅ |
| Recorrência (público que ele traz e volta) | do promoter | ✅ |
| Pessoas confirmadas (absoluto) | híbrido — revela o tamanho do evento | ⚠️ só em faixas ("100–500") |
| **Receita gerada (R$)** | **da produtora** | ❌ nunca |
| **Comissão (R$)** | deriva da receita — dá pra inverter | ❌ nunca |
| Nome das casas onde trabalhou | da produtora | ⚠️ só se a produtora liberar |

A régua: **o que mede a habilidade do promoter é dele; o que mede o tamanho do
negócio é da produtora.** Conversão é habilidade. Receita é negócio.

Isso ainda produz um ranking útil — "converte 34% dos convites, 78% de
comparecimento, 40+ rolês" diz mais pra quem contrata do que um número de
receita que depende do preço do ingresso da casa.

### 3.3 A produtora incumbente precisa ganhar algo

Duas formas, não excludentes:

- **Busca de promoter é recurso Pro.** Quem paga procura; quem não paga só é
  encontrado. Alinha o incentivo: a produtora que perde um promoter também é a
  que consegue repor.
- **Evento confidencial.** A produtora pode marcar uma edição como fora das
  estatísticas públicas. Dá controle a quem tem contrato ou lançamento sensível.

### 3.4 O feed: separar duas coisas que parecem uma

A ideia do feed embute **duas** funcionalidades muito diferentes:

**Promoter posta foto e relato do rolê** — é portfólio. Baixo risco político,
alto valor de vitrine. Mas cuidado com a foto: o álbum do rolê hoje é
semi-privado (abre no dia, quem tem o link vê). Um feed público é outra
exposição — tem gente identificável nas fotos, e isso é dado pessoal de terceiro
que nem o promoter nem a produtora podem publicar sozinhos. **Regra:** foto no
feed é do promoter (a produção dele, a casa cheia de longe), não o álbum dos
convidados.

**"Nota dos rolês"** — aqui depende de quem avalia quem, e são produtos
opostos:

| Direção | O que vira | Efeito |
| --- | --- | --- |
| Produtora avalia promoter | Carta de referência | Ajuda quem contrata. Aceitável pra todo mundo |
| **Promoter avalia produtora** | **Glassdoor de casa noturna** | Poderosíssimo pro promoter (casa que não paga comissão fica exposta) e **explosivo** com quem paga a assinatura |

O segundo é uma ideia forte e uma bomba comercial. Não é "não" — é uma decisão
consciente que não se toma por acidente ao construir um feed genérico.

---

## 4. Por que não construir isso agora

Três razões, em ordem de peso:

**1. Marketplace precisa de densidade.** Um ranking com 3 promoters e 1
produtora não tem valor pra ninguém. O cenário base do `business-plan.md` prevê
25 produtoras no mês 12 — e cada uma tem 2 a 5 promoters. A massa crítica pra
isso valer alguma coisa chega lá pelo ano 2.

**2. Hoje há zero usuários reais.** Não existe projeto Supabase no ar
(`roadmap.md` §0). Um marketplace sem os dois lados é uma tela vazia bonita.

**3. É exatamente a dispersão que o plano nomeia como risco.** O
`business-plan.md` §10 diz: *"o risco real é dispersão: seguir a ordem do
backlog"*. Esta é a ideia mais empolgante até agora — e é por isso que ela é a
mais perigosa pra sequência de trabalho.

---

## 5. O que fazer agora, que é barato e mantém a porta aberta

Uma coisa só: **transformar a página do promoter num portfólio que ele pode
mostrar.**

Ela já existe. Falta:

- um botão de compartilhar (o promoter manda pra uma casa nova: "meu histórico");
- esconder receita e comissão da versão compartilhável, deixando as taxas;
- um interruptor de "perfil público" que o promoter liga.

Isso é **de um lado só** — não precisa de marketplace, não cruza dado entre
produtoras, não tem cold start, e é útil a partir do primeiro promoter. E é
exatamente a peça que o ranking usaria depois: o ranking é uma lista ordenada de
perfis que já existem.

Se a pesquisa da fase 1 do roadmap mostrar promoters compartilhando esse link
por conta própria, a demanda pelo marketplace está provada com dado, não com
intuição — e aí o resto se constrói em cima de uma peça já validada.

---

## 6. Resumo

| | Veredicto |
| --- | --- |
| A ideia é boa? | **Sim** — e o vetor de distribuição pelo promoter é mais valioso que o ranking em si |
| Dá pra fazer do jeito óbvio? | **Não** — vaza faturamento entre concorrentes e esbarra na LGPD |
| Qual o desenho certo? | Promoter dono do perfil, opt-in, **taxas em vez de dinheiro**, busca como recurso Pro |
| Quando? | Depois de densidade — ano 2, não agora |
| O que dá pra fazer já? | Portfólio compartilhável do promoter (§5), pequeno e útil desde o primeiro usuário |
