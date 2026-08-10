# Galera — Estrutura jurídica e societária

Ponto de partida: hoje não existe CNPJ, é o fundador como pessoa física. Este documento decide **que
tipo de empresa abrir** dado que os dois caminhos em consideração são bootstrap (receita própria) e
captação de investidor-anjo/pré-seed — os dois precisam funcionar com a mesma estrutura, porque
trocar de tipo societário no meio do caminho custa tempo e dinheiro justo na hora que não sobra
nenhum dos dois.

**Aviso:** isto organiza as decisões e o vocabulário certo pra conversar com contador e advogado —
não substitui os dois. Nenhuma cláusula de contrato social ou acordo de sócios aqui deve ser assinada
sem revisão profissional.

---

## 1. A decisão que importa: não abrir como MEI

É tentador começar pelo MEI (grátis, rápido, um clique no gov.br). Pra o Galera, é o caminho errado
mesmo no cenário bootstrap, por três razões que não têm volta fácil:

| Limite do MEI | Por que quebra o plano |
| --- | --- |
| Teto de faturamento (~R$ 81 mil/ano — **confirmar valor vigente com o contador**, a lei reajusta este teto periodicamente) | O cenário base do `business-plan.md` projeta ~R$ 70 mil de receita **anualizada só no fim do ano 1**; no ano 2 o MEI já não serve |
| Não pode ter sócio | Fecha a porta pra trazer um cofundador técnico ou comercial depois |
| Não pode receber aporte de investidor | O instrumento de investimento-anjo (seção 3) exige uma sociedade — não existe "investidor-anjo de MEI" |

**Recomendação:** abrir direto como **Sociedade Limitada Unipessoal (SLU)** — uma LTDA com um único
sócio, criada pela Lei 13.874/2019 (Liberdade Econômica) justamente pra eliminar a exigência antiga de
dois sócios mínimos. Vantagens práticas:

- Mesma estrutura jurídica de uma LTDA "de verdade" — se um cofundador ou investidor entrar depois, é
  só alterar o contrato social pra incluir quotas dele, sem trocar o tipo de empresa.
- Responsabilidade limitada ao capital social (MEI também tem, mas sem as demais vantagens).
- Aceita enquadramento no Simples Nacional, igual o MEI.
- Aceita o instrumento de mútuo conversível do Marco Legal das Startups (seção 3).

Se já existe um cofundador definido antes de abrir, pula a SLU e vai direto pra **LTDA pluripessoal**
— a diferença de custo e prazo entre as duas é irrelevante.

---

## 2. Passo a passo de abertura

| # | Passo | Onde | Observação |
| --- | --- | --- | --- |
| 1 | Escolher nome empresarial e verificar disponibilidade | Junta Comercial do estado (JUCESP em SP) | "Galera" como razão social provavelmente já está em uso por outra empresa — comum registrar como "Galera Tecnologia LTDA" ou similar e usar "Galera" só como marca |
| 2 | Contratar contador | — | Não é opcional: ele monta o contrato social, faz o enquadramento tributário e cuida da folha mensal do Simples Nacional. Custo típico: R$ 150–350/mês pra empresa pequena, mais uma taxa de abertura |
| 3 | Definir objeto social e CNAE | Contador redige | CNAE principal sugerido: **62.01-5/01** (desenvolvimento de programas de computador sob encomenda) ou **62.09-1/00** (suporte técnico, manutenção e outros serviços em TI), mais um CNAE secundário de licenciamento de software se for cobrar assinatura recorrente (SaaS) |
| 4 | Definir capital social | Contrato social | Não precisa ser alto — R$ 1.000–10.000 é comum pra startup pré-receita. É o valor que aparece dividido em quotas na seção 4 |
| 5 | Registrar o Contrato Social | Junta Comercial (via Redesim, processo digital) | Gera o CNPJ automaticamente na sequência, integrado com a Receita Federal |
| 6 | Inscrição municipal (ISS) | Prefeitura | Necessária pra emitir nota fiscal de serviço (a assinatura Pro é serviço) |
| 7 | Enquadramento no Simples Nacional | Contador, na abertura ou até o fim de janeiro do ano seguinte | Ver a pegadinha do Fator R abaixo |
| 8 | Conta PJ | Banco digital (Nubank PJ, Inter, C6) resolve sem custo pra empresa pequena | Não pagar o valor do cliente na conta pessoal — quebra a separação patrimonial que a LTDA existe pra dar |
| 9 | Certificado digital e-CNPJ (opcional no início) | Certificadora credenciada | Só vira necessário quando o volume de nota fiscal justificar automação |

**Prazo:** com contador ativo, 1–3 semanas ponta a ponta pela via digital (Redesim). **Custo de
abertura:** taxa de registro na Junta varia por estado (R$ 0–200 em muitos casos pra empresa de
serviço), mais o honorário do contador pra montar o contrato social (R$ 300–800 é uma faixa razoável
pra cotar).

### A pegadinha do Fator R

Empresa de serviço de TI enquadrada no Simples Nacional cai no **Anexo III** (alíquota inicial ~6%)
ou no **Anexo V** (alíquota inicial ~15,5%), dependendo do **Fator R** — a razão entre a folha de
pagamento dos últimos 12 meses e a receita bruta do mesmo período. Fundador solo, sem holerite formal
(pró-labore baixo), sem funcionário: Fator R baixo, cai no Anexo V, que é **quase o dobro do imposto**
sobre a mesma receita. Duas formas de mitigar, pra conversar com o contador:

1. Pagar um pró-labore mais alto ao fundador — vira base do INSS, mas empurra o Fator R pra cima.
2. Aceitar o Anexo V no início (a receita ainda é pequena, o imposto absoluto também) e revisitar
   quando houver folha de verdade (primeiro funcionário ou sócio-operador com pró-labore).

Isso não muda a decisão de abrir — muda quanto sobra de caixa todo mês, e é por isso que entra também
na planilha financeira (`docs/startup/modelo-financeiro.xlsx`).

---

## 3. O que muda se um investidor entrar (Marco Legal das Startups)

A **Lei Complementar 182/2021** (Marco Legal das Startups) formalizou o instrumento que praticamente
todo pré-seed brasileiro usa hoje: o **contrato de opção ou mútuo conversível em participação
societária**, equivalente ao SAFE americano. Por que ele existe e por que interessa ao Galera:

- O investidor entra com dinheiro **sem virar sócio imediatamente** — o aporte converte em quotas só
  num evento futuro definido em contrato (nova rodada, prazo determinado, ou venda da empresa).
- Enquanto não converte, o investidor **não responde pelas dívidas da empresa nem tem direito a voto
  ou pro-labore** — proteção que existe justamente pra destravar investimento-anjo sem burocracia de
  sócio formal (complementa a Lei Complementar 155/2016, que já tratava do investidor-anjo).
- Não precisa avaliar a empresa (valuation) no momento do aporte — o valuation fica pra rodada
  seguinte, que é o problema real de negociar com empresa pré-receita.

**O que a SLU/LTDA precisa ter pronta antes de assinar um mútuo conversível:**

1. Contrato social permitindo aumento de capital por deliberação simples (padrão, mas confirmar
   redação com o advogado no momento).
2. Cap table limpa e documentada (seção 4) — investidor não assina sem saber quem já tem o quê.
3. Projeções financeiras defensáveis (`docs/startup/modelo-financeiro.xlsx`) — não precisa ser
   perfeita, precisa ser honesta sobre as suposições, no mesmo espírito do `business-plan.md`.

**O que não muda:** o tipo societário continua sendo LTDA/SLU. Não é preciso virar S.A. pra receber
investimento-anjo ou pré-seed no Brasil — isso só passa a fazer sentido em rodadas maiores (Series A
em diante), quando o número de investidores e a necessidade de ações preferenciais justificam o custo
extra de manter uma sociedade anônima.

---

## 4. Cap table — o que preparar mesmo antes de ter investidor

Ver `docs/startup/captacao.md` para o instrumento de investimento e o checklist de due diligence. Aqui
fica só a estrutura societária mínima:

| Quotista | % hoje (fundador solo) | Observação |
| --- | --- | --- |
| Fundador | 100% | Único quotista na SLU |

Se um cofundador entrar antes de qualquer aporte externo, defina nesse momento — não depois de já
estar em conversa com investidor:

- **Vesting das quotas do cofundador** (comum: 4 anos, 1 ano de cliff) — protege a empresa se o
  cofundador sair no mês 3.
- **Cláusula de não-concorrência e de saída** (o que acontece com as quotas dele se ele sair).
- Isso vai num **Acordo de Quotistas**, documento separado do contrato social, mais fácil de alterar.

---

## 5. Marca

"Galera" como nome de produto é distinto de "Galera" como razão social (ver passo 1). Antes de
investir em marca de verdade:

1. Pesquisar se "Galera" já está registrado no INPI pra classe de software/aplicativos
   ([busca.inpi.gov.br](https://busca.inpi.gov.br)) — nome comum, chance real de conflito.
2. Se livre, entrar com o pedido de registro de marca o quanto antes: o processo leva 12–18 meses no
   INPI, então o tempo de espera é motivo pra começar cedo, não pra esperar a empresa crescer.
3. Enquanto o registro não sai, o uso comercial já gera algum direito, mas é o registro que dá
   exclusividade nacional — relevante se a distribuição B2C (Recap, K-factor) funcionar como o plano
   de negócio aposta.
