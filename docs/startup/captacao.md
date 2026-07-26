# Galera — Captação: cap table, instrumento e o que o investidor pede

Este documento assume a leitura de `docs/startup/estrutura-juridica.md` primeiro — a SLU/LTDA e o
mútuo conversível já estão decididos lá. Aqui é o que fazer com esse instrumento na prática: quanto
levantar, com que termos, e o que ter pronto antes da primeira conversa com investidor.

**Alinhado ao `business-plan.md`, seção 12:** captação só faz sentido depois do marco do mês 6 (5
produtoras pagantes, app no TestFlight) — antes disso não há o que um investidor compraria que o
tempo sozinho não resolvesse, e a diluição seria pelo preço errado. Este documento existe pra estar
**pronto** quando esse marco chegar, não pra sair captando agora.

---

## 1. Quanto levantar e pra quê

Regra prática de pré-seed: levantar o suficiente pra alcançar o **próximo marco que muda a
avaliação**, não pra "ter caixa". Três cenários de tamanho de rodada, calibrados pelo custo fixo real
do negócio (~R$ 215/mês hoje, ver `business-plan.md` seção 7):

| Rodada | Valor | O que compra | Runway |
| --- | --- | --- | --- |
| **Pré-seed enxuta** | R$ 150–250 mil | Fundador em tempo integral (pró-labore) + 1 pessoa comercial/suporte por 12–15 meses, sem tirar o custo de infra do orçamento | 12–15 meses |
| **Pré-seed padrão** | R$ 400–600 mil | Time pequeno (2–3 pessoas: produto, comercial, suporte), verba de aquisição B2B (visitas, eventos), 1 ano de fôlego | 15–18 meses |
| **Não recomendado agora** | Seed (R$ 1,5 mi+) | Só faz sentido depois de ter dezenas de produtoras pagantes e um K-factor validado — captar isso agora dilui demais por uma tese ainda não provada |

**O motivo de recomendar a rodada enxuta:** o negócio já roda com R$ 215/mês de custo fixo e margem
bruta >90% (business-plan.md, seção 7). O capital aqui não é sobrevivência — é **acelerar o ritmo de
um fundador solo**, contratando a peça que falta (normalmente comercial, porque produto o fundador já
sabe fazer). Pedir mais do que isso é pedir dinheiro pra um problema que a rodada não resolve.

---

## 2. O instrumento: mútuo conversível (Marco Legal das Startups)

Termos que costumam aparecer num mútuo conversível brasileiro pré-seed — cada um é negociável, isto é
o vocabulário, não uma oferta pronta:

| Termo | O que significa | Faixa comum em pré-seed BR |
| --- | --- | --- |
| **Valuation cap** | Teto de valuation pra conversão — protege o investidor de diluição se a próxima rodada vier cara demais | R$ 3–8 milhões pra um pré-seed com produto funcional e tração inicial (poucas dezenas de clientes pagantes) |
| **Desconto de conversão** | % de desconto sobre o preço da rodada seguinte, na hora de converter | 15–25% |
| **Prazo de conversão** | Prazo máximo antes de forçar conversão ou devolução | 18–24 meses |
| **Gatilho de conversão** | Evento que dispara a conversão automática (nova rodada com investidor líder, ou M&A) | Rodada subsequente de valor mínimo definido (ex: R$ 500 mil aportados por terceiros) |
| **Pro-rata** | Direito do investidor de manter o % dele em rodadas futuras, investindo de novo | Comum conceder pros primeiros investidores-anjo |

**O que decide o valuation cap de verdade:** não é fórmula, é comparável — startups B2B early-stage
brasileiras com MRR de baixos milhares e produto em produção (não é mais protótipo) costumam captar
pré-seed com cap entre R$ 3–8 milhões. O K-factor e o número de produtoras pagantes do marco do mês 6
são o que sustenta a conversa dentro dessa faixa em vez de abaixo dela.

---

## 3. Cap table pós-rodada (exemplo pra modelar, não é proposta)

Supondo aporte de R$ 200 mil via mútuo conversível com cap de R$ 4 milhões e desconto de 20%, e uma
rodada seguinte que valida o cap (ou seja, converte pelo cap, que é o cenário mais comum quando o cap
é o fator limitante):

| Quotista | Antes da conversão | Depois (ilustrativo) |
| --- | --- | --- |
| Fundador | 100% | ~95% |
| Investidor-anjo (pré-seed) | 0% (mútuo, ainda não é quotista) | ~5% |

A matemática exata depende do valuation da rodada que dispara a conversão — isso é o que o
`modelo-financeiro.xlsx` calcula na aba de captação, com o cap e o desconto como variáveis que dá pra
trocar.

**Regra de proteção pro fundador:** nunca assinar um mútuo conversível sem um cap definido (mútuo sem
cap transfere todo o upside pro investidor se a empresa crescer rápido) e sempre revisar com advogado
antes de assinar — este documento dá o vocabulário pra negociar, não substitui a revisão contratual.

---

## 4. O que o investidor-anjo brasileiro pede pra conversar (checklist)

Preparar antes da primeira reunião, não depois de ser pedido — cada item sem resposta é um motivo pra
adiar o "sim":

- [ ] **Pitch deck** de 10–12 slides: problema, produto, tração, mercado, modelo de receita, unit
  economics, time, pedido (quanto + pra quê). O deck de `docs/business-plan.md` e
  `docs/marketing-plan.md` já tem o conteúdo — falta consolidar em slides.
- [ ] **Cap table atual**, mesmo que seja só "100% fundador" — investidor quer ver que não existe
  bagunça societária escondida.
- [ ] **Modelo financeiro** (`modelo-financeiro.xlsx`) com as suposições explícitas, no mesmo espírito
  do `business-plan.md`: "aqui é medido, aqui é suposição".
- [ ] **Métricas reais do produto**: número de rolês criados, K-factor, produtoras pagantes, MRR,
  churn — os números da seção 11 do `business-plan.md`, mesmo que ainda pequenos. Investidor early
  stage não espera número grande, espera **número real e mensurado**.
- [ ] **Contrato social e situação fiscal em dia** (Simples Nacional, sem pendência) — devido à SLU já
  estar aberta conforme `estrutura-juridica.md`, isso deve estar OK por construção.
- [ ] **Referências de cliente**: 2–3 produtoras dispostas a validar por telefone que usam e pagam.
- [ ] **Um "porquê agora"**: o que muda com o capital que não muda sem ele — normalmente é "contratar
  a pessoa comercial que o fundador solo não consegue ser ao mesmo tempo que constrói o produto".

---

## 5. Onde procurar

Sem inventar contato específico, os canais que funcionam pra pré-seed B2B brasileiro nessa faixa de
ticket:

- **Redes de investidor-anjo**: grupos como Anjos do Brasil, ABStartups (eventos de conexão),
  aceleradoras regionais com programa de pré-seed.
- **Fundadores de startups B2B já capitalizadas** — geralmente viram anjo de outras startups no mesmo
  estágio que passaram, e entendem o produto mais rápido que um fundo tradicional.
- **Editais e programas de aceleração** (InvestSP, SEBRAE Startup, aceleradoras de universidade — a
  tese "nasceu na USP" do `marketing-plan.md` ajuda aqui) — costumam trazer capital pequeno + mentoria
  sem diluir tanto quanto um anjo isolado.

O critério de prontidão pra procurar qualquer um destes: ter passado do marco do mês 6
(`business-plan.md`, seção 12). Procurar antes disso é otimizar pra rejeição.
