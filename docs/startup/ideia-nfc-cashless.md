# Ideia 3 — Cartão NFC e cashless: leituras e o caminho viável

A ideia, do jeito que surgiu: *"toda vez que você vai numa festa nova tem que
retirar um cartão novo (tipo o da Zig). E se a gente criasse um cartão NFC que
já desse acesso fácil, servisse de pagamento dentro do estabelecimento, e a
casa só precisasse te revistar na entrada?"*

A dor é real e bem observada. Este documento é pra você formar opinião própria
sobre o **tamanho** do que ela exige — separando a parte que é cara e regulada
da parte que o Galera já quase faz.

---

## 1. Por que isso é outra empresa, não uma feature

Cashless de verdade significa guardar saldo de terceiro e movimentar dinheiro.
No Brasil, isso é atividade de **Instituição de Pagamento (IP)** e exige
autorização prévia do Banco Central.

O que mudou recentemente e vale ler:

- **Resolução BCB nº 494/2025** — reforçou que *toda* IP precisa de autorização
  prévia e antecipou o prazo de regularização de dezembro/2029 para **maio de
  2026**. Ou seja: a janela de "operar primeiro, regularizar depois" fechou.
- **Capital mínimo** — a metodologia nova (Resolução Conjunta nº 14) calibra o
  capital pelo que a instituição de fato faz. As faixas noticiadas para 2026
  ficam na ordem de **R$ 5 milhões** (conta transacional Pix) a **R$ 7–11
  milhões** (IP emissora de moeda eletrônica, que é exatamente o caso do
  cashless). Confirme o número aplicável com advogado — a regra é recente e as
  publicações divergem no detalhe.

Leituras:
- [Requisitos para fintech no Brasil — guia 2026 (Celcoin)](https://pulse.celcoin.com.br/requisitos-para-fintech-no-brasil/)
- [Como obter autorização do BC para fintech (Celcoin)](https://pulse.celcoin.com.br/autorizacao-banco-central-fintech/)
- [Mudanças no capital mínimo das instituições autorizadas (NDM Advogados)](https://ndmadvogados.com.br/artigo/mudancas-no-capital-minimo-das-instituicoes-autorizadas/)
- [Novas regras de autorização, governança e capital mínimo (CSMV Advogados)](https://www.csmv.com.br/boletins/novas-regras-de-autorizacao-governanca-e-capital-minimo-para-instituicoes-financeiras-e-de-pagamento/)
- [Capital mínimo de fintechs sobe até 5x (Let's Money)](https://www.letsmoney.com.br/regulacao/capital-minimo-fintechs-banco-central-novas-regras)

**Compare com o plano atual:** o `business-plan.md` opera com custo fixo de
~R$ 215/mês e a rodada pré-seed sugerida em `captacao.md` é de R$ 150–250 mil.
O capital mínimo regulatório sozinho é ~30x a rodada inteira — antes de
qualquer hardware, equipe de compliance ou integração com maquininha.

---

## 2. Quem já está nesse ringue

A **Zig** (fusão ZigPay + netPDV) é a referência do mercado brasileiro: captou
R$ 40 milhões numa rodada, transaciona na casa de **R$ 2 bilhões de TPV** e
opera eventos do porte de Rock in Rio, Lollapalooza e GP do Brasil de F1.

Leituras:
- [Aporte de R$ 40 milhões (Startupi)](https://startupi.com.br/fintech-de-gestao-de-consumo-e-pagamento-cashless-recebe-aporte-de-r-40-milhoes/)
- [Depois da fusão, ZigPay+netPDV agora é Zig (Startups.com.br)](https://startups.com.br/negocios/depois-de-fusao-zigpaynetpdv-agora-e-zig/)
- [O que é cashless em eventos — pela própria Zig](https://blog.zig.fun/cashless-em-eventos/)

Entrar de frente contra isso, pré-receita e sem licença, não é ambição — é
escolher a briga mais cara possível. **Mas** vale ler o blog deles justamente
pra entender como *eles* explicam a dor: é o vocabulário que a casa noturna já
entende, e serve pro seu pitch mesmo sem você fazer cashless.

---

## 3. Dois caminhos intermediários que valem estudo

### 3a. BaaS — alugar a licença de outro

**Banking as a Service** permite oferecer conta, Pix e cartão pré-pago via API
de uma instituição que *já* é autorizada. É como fintechs sem licença própria
operam.

Atenção a uma mudança importante: a **Resolução Conjunta nº 16/2025** definiu o
arranjo de BaaS e, na prática, **acabou com o "white label" puro** — agora é
obrigatório que a instituição autorizada seja identificável pelo cliente final,
não escondida atrás da sua marca. Quem tinha contrato antigo tem até
**31/12/2026** pra se adequar.

Leituras:
- [O que é BaaS no Brasil — guia (Celcoin)](https://celcoin.com.br/articles/o-que-e-baas-brasil/)
- [BaaS: regra, integração e mais (Asaas)](https://blog.asaas.com/baas/)
- [BaaS white label: como funciona (Grafeno)](https://grafeno.digital/blog/baas-white-label-como-funciona/)
- [Democratização de serviços financeiros e o BaaS (EY Brasil)](https://www.ey.com/pt_br/insights/financial-services/democratizacao-de-servicos-financeiros-e-o-banking-as-a-service)

Isso derruba a barreira de capital, mas **não zera** o custo: continua havendo
diligência, contrato, integração e responsabilidade compartilhada. É um caminho
de ano 2–3, não de agora.

### 3b. Arranjo de pagamento fechado — o "vale-refeição da casa"

Um **arranjo fechado** (o emissor e o credenciador são a mesma empresa, e o
saldo só vale dentro daquele ambiente) tem limites de autorização bem mais
altos: a Resolução BCB nº 89/2021 elevou o gatilho para **R$ 20 bilhões e 100
milhões de transações/ano** (era R$ 500 milhões e 25 milhões).

Leituras:
- [BC flexibiliza limites e regras para arranjos de pagamento (Agência Brasil)](https://agenciabrasil.ebc.com.br/economia/noticia/2021-04/banco-central-flexibiliza-limites-e-regras-para-arranjos-de-pagamento)
- [Instituições de pagamento: quando pedir autorização? (Levy & Salomão)](https://www.levysalomao.com.br/publicacoes/artigo/instituicoes-de-pagamento-quando-pedir-autorizacao)
- [BC atualiza normas sobre arranjos de pagamento (Felsberg)](https://www.felsberg.com.br/banco-central-atualiza-normas-sobre-arranjos-de-pagamentos/)

**Cuidado:** limite alto de *arranjo* não dispensa a autorização da
*instituição* que emite a moeda eletrônica. São duas exigências diferentes, e é
exatamente aqui que uma leitura apressada leva a startup pro buraco. Leve essa
distinção pro advogado antes de qualquer decisão.

---

## 4. A versão da sua ideia que dá pra fazer agora

Separe a ideia em duas metades:

| Metade | O que é | Custo |
| --- | --- | --- |
| **Identidade / acesso** | "não preciso pegar cartão novo toda festa" | Baixo — você já tem 90% |
| **Pagamento** | saldo, consumo no bar, conciliação | Licença + milhões |

A primeira metade é **quase o que o Galera já faz**: `docs/b2b.md` já descreve o
QR de entrada e a portaria com check-in. O passo natural é transformar isso em
**identidade recorrente**: a mesma pessoa, o mesmo QR/credencial, em toda festa
daquela casa — o que já mata a fila do cadastro e alimenta o motor de audiência
(`src/lib/audience.ts`), que é o diferencial defensável do plano.

Isso entrega parte real da dor que você descreveu ("não quero retirar um cartão
novo") sem tocar em nada regulado. E cria justamente o ativo que tornaria uma
conversa futura sobre pagamento — com um parceiro BaaS ou até com a própria Zig
— possível a partir de uma posição de força, e não de pedido.

### NFC especificamente

Se um dia a identidade virar física, dá pra estudar NFC sem pagamento embutido:
uma tag que só carrega um identificador (equivalente ao QR, mas em plástico).
Aí a discussão é de custo unitário e logística de distribuição, não de licença.
Vale só quando existir uma casa com agenda semanal pedindo — antes disso é
hardware parado.

---

## 5. O que eu faria com essa ideia

1. **Guardar a tese**, não a implementação. "Identidade única do frequentador"
   é uma boa linha pro slide de visão do `pitch-deck` — mostra que você enxerga
   além da feature atual.
2. **Construir a identidade recorrente** quando houver a primeira casa com
   agenda semanal (o perfil "Pro Casa" do `business-plan.md`, seção 6).
3. **Só então** avaliar BaaS, com receita recorrente na mão e advogado
   contratado.

O risco real aqui não é a ideia ser ruim — é ela ser boa o suficiente pra te
tirar do caminho que está funcionando. O `business-plan.md` já nomeia isso na
seção 10: *"o risco real é dispersão: seguir a ordem do backlog"*.
