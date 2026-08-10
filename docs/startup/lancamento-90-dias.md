# Galera — Plano de lançamento: a trilha de operação (90 dias)

`docs/marketing-plan.md` (seção 7) já tem o calendário de **canal** — o que postar, quem procurar,
quando abrir o B2B. Este documento é a trilha paralela que falta: o que precisa existir **por trás**
do produto pra ele virar empresa que emite nota fiscal, cobra assinatura e assina cliente sem
depender de "confia em mim" — a parte que não aparece no Instagram mas que trava tudo se faltar na
hora de cobrar o primeiro cliente Pro.

As semanas abaixo são as mesmas do `marketing-plan.md` seção 7 — rode os dois lado a lado.

---

## Agosto — fundação (semanas 1–4)

| Semana | Operação |
| --- | --- |
| 1 | Abrir a SLU (`docs/startup/estrutura-juridica.md`): escolher nome empresarial, contratar contador, dar entrada no registro. Em paralelo ao P0 técnico — nenhum dos dois espera o outro |
| 2 | Conta PJ no banco. Definir pró-labore do fundador (mesmo que baixo) — é o que começa a formar o Fator R corretamente desde o início |
| 3 | CNPJ deve estar de pé nesta semana (prazo típico da Redesim). Emitir a primeira nota fiscal de teste, mesmo que R$ 0, pra validar que a prefeitura e o Simples Nacional estão configurados |
| 4 | Termos de Uso e Política de Privacidade como documento formal, assinado pela pessoa jurídica — hoje o texto de `/privacidade` no app é produto, não é o documento legal que ampara a empresa num litígio |

## Setembro — primeira cobrança (semanas 5–8)

| Semana | Operação |
| --- | --- |
| 5 | Meio de cobrança recorrente: Stripe, Pagar.me ou Asaas com boleto/PIX/cartão pra assinatura Pro — decidir antes de ter o primeiro cliente disposto a pagar, não depois |
| 6 | Contrato de prestação de serviço (o que o cliente Pro assina) — cobre o papel de operador de dados da LGPD já mencionado no `business-plan.md` (risco de seção 10): a produtora é controladora dos dados dela, o Galera é operador, e isso precisa estar escrito, não implícito |
| 7 | Canal de suporte oficial (WhatsApp Business ou e-mail dedicado, não o número pessoal do fundador) — é o que separa "startup" de "favor de amigo" na cabeça do cliente pagante |
| 8 | Primeiro piloto gratuito rodando (alinhado à decisão do `marketing-plan.md` semana 8) — usar esse piloto pra testar o fluxo de cobrança e contrato de ponta a ponta antes do cliente pagante de verdade |

## Outubro — primeiro cliente pagante (semanas 9–12)

| Semana | Operação |
| --- | --- |
| 9 | Página de preços pública (hoje os planos só existem em prosa no `business-plan.md`) — o cliente que vem da campanha B2B do `marketing-plan.md` semana 9 precisa ver preço sem pedir |
| 10 | Emitir a primeira nota fiscal de assinatura de verdade, no piloto que virou pagante. Validar que o dinheiro cai na conta PJ, não na pessoal |
| 11 | Checklist de renovação: o que acontece quando o cartão do cliente recusa, quando ele quer cancelar, quando ele quer nota fiscal retroativa — decidir a política antes do primeiro caso, não durante |
| 12 | Fechar o mês com: CNPJ ativo, ao menos 1 cliente pagante com nota fiscal emitida, contrato assinado, cobrança recorrente funcionando sem intervenção manual. Isso é o que torna o marco do mês 4–6 do `business-plan.md` (5 produtoras pagantes) uma operação que escala, não um favor cobrado no PIX pessoal |

---

## O que fica fora dos 90 dias (de propósito)

- **Certificado digital e-CNPJ / NF-e automatizada**: só compensa o custo quando o volume de nota
  fiscal justificar — com poucos clientes, emissão manual pelo painel da prefeitura resolve.
- **CLT ou contratação formal de funcionário**: antes do marco de captação ou de receita que sustente
  folha, contratos de prestação de serviço (PJ) pra quem ajudar é mais barato e mais flexível.
- **Registro de marca concluído**: o pedido no INPI (seção 5 de `estrutura-juridica.md`) deve ser
  **protocolado** nesses 90 dias — o processo de concessão em si leva mais de um ano e não bloqueia
  nada no caminho.

## Critério de sucesso dos 90 dias

Não é receita — é **a empresa existir de forma que aguenta ser auditada**: CNPJ ativo, imposto em
dia, contrato assinado por quem paga, nota fiscal emitida, dinheiro no lugar certo. É isso que faz a
diferença entre "app que uns amigos usam" e "empresa que um investidor ou um cliente grande consegue
confiar", exatamente o que o checklist de due diligence de `docs/startup/captacao.md` cobra.
