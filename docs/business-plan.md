# Galera — Plano de negócio

Versão de julho/2026. Escrito sobre o produto que **existe** (código rodando, testado), não sobre
uma visão. Onde há estimativa, está marcado como **[suposição]** — e com o método de validar.

---

## 1. Resumo executivo

O Galera é um app de convite de rolê que resolve, pro lado do convidado, o que o grupo de WhatsApp
faz mal: saber quem vai. E que resolve, pro lado de quem organiza como negócio, o que planilha e
lista de papel fazem pior ainda: saber **quem vale a pena chamar de novo**.

- **B2C (grátis, para sempre):** convite bonito, RSVP, enquete, mural, álbum e o **Recap** — imagem
  1080×1920 que o anfitrião posta no Stories. O Recap é o canal de aquisição, não uma feature.
- **B2B (assinatura):** o **Galera Pro** transforma o histórico da produtora numa base pontuada por
  rentabilidade, dispara campanha por WhatsApp com link rastreável, gerencia promoters por comissão
  e roda a portaria.

**A tese em uma frase:** todo mundo que vende software de portaria compra tráfego pra achar
produtora; o Galera ganha o convidado de graça pelo Recap e depois vende a camada Pro pra quem já
tem o próprio público dentro do app.

**Onde estamos:** produto funcional nas duas pontas, dois backends (local e Supabase), 54 testes,
fluxos verificados ponta a ponta. Falta subir um projeto Supabase (uma tarde) e cumprir seis itens
de P0 (`docs/melhorias.md`) para operar de verdade.

---

## 2. O problema

**Para quem convida (B2C).** Confirmação vira arqueologia de scroll. Adicionar gente nova expõe o
número de todo mundo. A enquete some no histórico. Depois da festa, o grupo não morre. E o anfitrião
termina sem nenhum dado — nem quantos foram.

**Para quem organiza como negócio (B2B).** A dor não é vender ingresso: é **encher a casa numa
terça**. Hoje o organizador brasileiro típico:

- mantém a lista num Google Sheets e no WhatsApp do promoter;
- não sabe quem já veio três vezes nem quanto cada um gastou;
- dispara convite pra "todo mundo" e queima a base;
- paga comissão de promoter no grito, sem atribuição confiável;
- na porta, procura nome numa planilha aberta no celular.

O ativo mais valioso da produtora — a relação com o público que já pagou pra entrar — não está em
lugar nenhum. É esse ativo que o Galera Pro cria.

---

## 3. Produto: o que já existe

| Bloco | Estado |
| --- | --- |
| Convite, RSVP, enquete, mural, álbum, lembrete de calendário | ✅ em produção no código |
| Recap 1080×1920 com Web Share | ✅ |
| Link de convite por hash, funciona em web e dentro do app | ✅ |
| Backend Supabase: schema, RLS, realtime, storage | ✅ código pronto, projeto não criado |
| Pro: score de público, tiers, campanha com projeção | ✅ |
| Pro: links rastreáveis, promoters com comissão, portaria | ✅ |
| WhatsApp com opt-in e fila | ✅ semiautomático (envio confirmado por humano) |
| App iOS empacotado | ⏳ Capacitor configurado, falta rodar no Mac |

O diferencial técnico defensável é o **motor de audiência** (`src/lib/audience.ts`): pontua cada
pessoa de 0 a 100 por receita, frequência, comparecimento, recência e indicações, e projeta
presenças e receita usando a taxa histórica **individual** — não o preço cheio multiplicado por
gente. Isso é o que permite chegar num promoter e dizer "chame estas 40 pessoas e espere 28
presenças", em vez de "mande pra base".

---

## 4. Mercado

Não vou inventar um TAM. Vou dar o método, porque ele é executável em uma semana e vale mais que um
número redondo.

**Como dimensionar (a fazer):**

1. **Estabelecimentos:** contagem de CNPJs ativos em CNAEs de bares com entretenimento, casas
   noturnas e produção de eventos, nos dados abertos da Receita Federal, por município. Filtrar por
   porte.
2. **Produtoras informais:** essas não têm CNAE útil. Contar perfis de Instagram que publicaram
   evento nos últimos 90 dias em SP/Campinas/Ribeirão, por hashtag e geolocalização. É trabalhoso e
   é justamente onde está o cliente inicial.
3. **Validação de disposição a pagar:** 20 conversas antes de qualquer linha de código nova.

**Ordem de grandeza para calibrar ambição [suposição, a validar]:** o alvo inicial realista não é
"o mercado brasileiro de eventos", é **as produtoras universitárias e coletivos da Grande São Paulo
que fazem pelo menos um evento por mês**. Se forem algumas centenas, uma fatia de 20–60 contas
pagantes no primeiro ano já valida o modelo — e é isso que as projeções da seção 8 assumem.

**SOM inicial declarado:** 50 produtoras pagantes na Grande SP em 18 meses.

---

## 5. Concorrência

Esta seção existe porque o espaço **não é vazio** — e fingir que é seria o erro mais caro do plano.

| Quem | O que faz bem | Brecha que deixa |
| --- | --- | --- |
| **Sympla / Eventbrite** | Ticketing com marca e confiança. 10% + 2–2,5% de processamento; grátis se o evento é grátis ([Sympla](https://produtores.sympla.com.br/quanto-custa/)) | É caixa registradora, não CRM. Não ajuda a **encher** a casa; ajuda a cobrar quem já decidiu ir |
| **VipMe, REVO, VIPOU, AZ List, Powerlist** | Lista, portaria, QR, ranking de promoter. Powerlist vende 100% offline | Vendem pra casa noturna de porta em porta: **zero distribuição no convidado**. E são ferramenta de operação, não de reativação de público |
| **Partiful** | O convite bonito que inspirou isto | Sem presença no Brasil, sem PIX, sem promoter, sem portaria, tudo em inglês |
| **Grupo de WhatsApp** | Grátis, todo mundo já está lá | Não gera nenhum artefato compartilhável nem nenhum dado |

**Nosso lugar:** somos o único que entra pelo convidado e sobe pro organizador. Os concorrentes de
portaria têm CAC de venda direta; nós temos um Recap que circula sozinho. E nenhum deles pontua o
público por rentabilidade — todos param no "quantos entraram".

**Onde estamos atrás, e é preciso admitir:** portaria offline e QR code. Um clube com sinal ruim
elimina o Galera na primeira demo. Estão como itens 12 e 13 em `docs/melhorias.md` justamente por
isso.

---

## 6. Modelo de receita

### Linha 1 — Assinatura Pro (principal)

| Plano | Preço [suposição de posicionamento] | Para quem |
| --- | --- | --- |
| **Galera** | Grátis pra sempre | Pessoa física. Nunca cobrar aqui: é o canal de aquisição |
| **Pro Coletivo** | R$ 129/mês (R$ 1.290/ano) | Produtora ou coletivo, eventos ilimitados, até 2.000 contatos, promoters e portaria |
| **Pro Casa** | R$ 349/mês | Casa com agenda semanal: vários usuários na portaria, contatos ilimitados, relatórios |

O preço mira abaixo do custo mensal de **um** promoter, que é a alternativa real de gasto do cliente.

### Linha 2 — Mensagens (margem sobre custo)

Preços verificados da Meta ([desenvolvedores](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing),
[faixa BR](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil)):

| Tipo | Custo Meta (BR) | O que é no Galera | Preço ao cliente |
| --- | --- | --- | --- |
| Marketing | ~US$ 0,0625 ≈ **R$ 0,35** | Campanha: chamar público pro próximo rolê | **R$ 0,49** por mensagem |
| Utility | ~US$ 0,0068 ≈ **R$ 0,04** | Lembrete de quem já confirmou | **Incluso no plano** |
| Serviço (resposta em 24h) | Grátis | Conversa iniciada pelo convidado | Grátis |

A diferença de 9x entre marketing e utility é uma decisão de produto, não um detalhe de fatura:
**lembrete a R$ 0,04 vira feature gratuita que segura a renovação; campanha a R$ 0,35 é o que se
cobra.** Quem entender isso primeiro tem margem estrutural.

### Linha 3 — Transação (fase 2)

Taxa sobre vaquinha PIX e venda de ingresso, na casa de 2%, só depois de integrar um PSP. Fora do
escopo até haver volume: receber em nome de terceiro tem implicação regulatória (item 15 do backlog).

### Linha 4 — Patrocínio (fase 3)

Marca de bebida patrocina a enquete ("qual drink não pode faltar?") ou o tema do Recap. Só faz
sentido com dezenas de milhares de recaps/mês. **Regra inegociável:** patrocínio nunca substitui a
marca do Galera no Recap — a marca é o motor de distribuição.

---

## 7. Unit economics

### A conta que se leva pro cliente

Campanha real, com os números que o próprio app projeta:

```
200 convites de campanha (marketing)      custo Meta:  200 × R$ 0,35  = R$   70
                                          cobrado:     200 × R$ 0,49  = R$   98
presenças previstas (taxa individual)     ~30%                        =     60 pessoas
ingresso médio                            R$ 70                       = R$ 4.200 pra produtora
custo da campanha sobre a receita gerada                              =    2,3%
```

Comparação que fecha a venda: a mesma produtora paga 10%+ pra ticketeira **depois** que a pessoa
decidiu ir. O Galera cobra ~2% pra **fazer** ela decidir.

### Nossa conta

**ARPU esperado [suposição]:** R$ 129 de assinatura + ~R$ 100/mês de campanhas = **R$ 229/conta**.

**Custo de servir:** Supabase Pro US$ 25/mês cobre dezenas de contas no começo; o custo variável real
é mensagem, que é repassada com margem. Custo marginal por conta ≈ **R$ 15/mês**. Margem bruta > 90%.

**Churn [suposição de trabalho]: 6%/mês no ano 1** — alto de propósito, porque produtora pequena é
sazonal e some em julho. LTV = 229 ÷ 0,06 ≈ **R$ 3.800**.

**CAC:** venda fundador-a-fundador nos primeiros 20 clientes ≈ R$ 0 em dinheiro. Com vendedor,
**R$ 400–800 [suposição]**. LTV/CAC continua confortável mesmo se o churn for o dobro do previsto —
que é o teste que esse número precisa passar.

### Custo fixo pra operar

| Item | R$/mês |
| --- | --- |
| Supabase Pro | ~140 |
| Apple Developer (US$ 99/ano) | ~45 |
| Domínio e e-mail | ~30 |
| **Total** | **~215** |

Isso é a razão de o plano não pedir capital: o negócio **cabe no bolso** até dar sinal.

---

## 8. Projeções (12 meses)

Cenários, não previsões. Os direcionadores estão explícitos pra você trocar por dados reais assim
que existirem.

| | Conservador | Base | Otimista |
| --- | --- | --- | --- |
| Produtoras pagantes (mês 12) | 8 | 25 | 60 |
| MRR de assinatura | R$ 1.030 | R$ 3.700 | R$ 9.500 |
| MRR de mensagens | R$ 500 | R$ 2.000 | R$ 5.400 |
| **MRR total (mês 12)** | **R$ 1.530** | **R$ 5.700** | **R$ 14.900** |
| Usuários B2C acumulados | 3 mil | 15 mil | 60 mil |
| K-factor implícito | 0,3 | 0,6 | 1,1 |

**Direcionadores assumidos:**
- Cada rolê traz em média 12 convidados que abrem o link. **[suposição — medir no dia 1]**
- 1 em 5 anfitriões gera Recap; 1 em 3 desses posta. **[suposição — item 7 do backlog existe pra medir]**
- No B2B, ~30% das produtoras que fazem um piloto viram pagantes. **[suposição]**
- Sazonalidade real: dezembro–março (Carnaval, verão) e junho (festa junina) valem 2x uma média;
  julho e agosto valem metade.

**A leitura honesta:** nenhum cenário aqui é "unicórnio no ano 1". O cenário base é um negócio de
~R$ 70 mil de receita anualizada no fim do primeiro ano — pequeno, mas com margem alta, custo fixo de
R$ 215/mês e um loop de aquisição que não depende de mídia paga. É um negócio que se sustenta
enquanto procura a escala, e é isso que o torna financiável depois.

---

## 9. Estratégia de entrada

Detalhada em `docs/marketing-plan.md`. Em três frases:

1. **Hiperlocal primeiro:** rede da USP — repúblicas, atléticas, centros acadêmicos, handebol. Não é
   "começar pequeno", é onde o loop fecha rápido porque as pessoas se conhecem.
2. **B2C alimenta B2B:** cada produtora abordada já vai ver o próprio público dentro do app. O pitch
   deixa de ser "compre um software" e vira "olha quem já está aqui".
3. **Sazonalidade como calendário de vendas:** fechar produtora em outubro–novembro pra ela usar no
   pico de dezembro–março.

---

## 10. Riscos e o que fazer

| Risco | Gravidade | Mitigação |
| --- | --- | --- |
| **Dependência da Meta.** Preço muda, política muda, conta é banida | Alta | Envio semiautomático mantém o número vivo hoje; API oficial com BSP depois; e-mail como canal secundário |
| **Incumbente de portaria** (VipMe, REVO, Powerlist) reage | Média | Eles não têm distribuição no convidado. Corrida é por offline+QR (backlog 12 e 13) antes de encarar casa grande |
| **Sympla adiciona CRM de público** | Média | Seria validação. Nossa vantagem é a base construída pelo lado do convidado, que eles não têm |
| **Partiful entra no Brasil** | Baixa–média | Eles não têm PIX, promoter nem portaria — nada do B2B brasileiro |
| **Sazonalidade** derruba receita em julho | Alta e certa | Plano anual com desconto; caixa dimensionado pro vale |
| **LGPD:** somos **operador**, a produtora é **controladora** | Alta | Contrato de tratamento nos termos do Pro (backlog 20), consentimento já registrado com data, opt-out funcionando (backlog 3) |
| **Fundador solo, tempo limitado** | Alta | Custo fixo de R$ 215/mês permite ritmo lento sem quebrar. O risco real é dispersão: seguir a ordem do backlog |

---

## 11. Métricas que decidem

Poucas, e nessa ordem:

1. **K-factor** — convidados que viram anfitriões. Se ficar abaixo de 0,5 por dois trimestres, a tese
   de distribuição orgânica está errada e o plano vira venda B2B direta.
2. **Taxa de compartilhamento do Recap** — o gargalo do K-factor. Hoje não medida (backlog 7).
3. **Produtoras ativas** (com evento nos últimos 30 dias) — vaidade é conta criada; verdade é evento.
4. **Presenças atribuídas a campanha** — é a métrica que renova a assinatura, porque é o ROI que o
   cliente sente.
5. **Retenção por coorte de produtora** no mês 3 e no mês 6.

---

## 12. Marcos (sem captação)

| Prazo | Marco | Como se sabe que passou |
| --- | --- | --- |
| Mês 1 | Backend no ar, P0 fechado, 3 rolês reais de amigos | Duas pessoas confirmam do mesmo link em celulares diferentes |
| Mês 2 | 10 rolês reais, Recap instrumentado | Existe um número de K-factor, mesmo que ruim |
| Mês 3 | 1ª produtora piloto (grátis) usando portaria de verdade numa festa | Check-in real na porta, sem planilha |
| Mês 4–6 | 5 produtoras pagantes | Primeiro R$ de MRR recorrente |
| Mês 6 | App no TestFlight | Convite abre no app instalado |
| Mês 12 | Cenário base: 25 produtoras, MRR ~R$ 5,7 mil | — |

**Captação:** só faz sentido depois do marco do mês 6, e só se o K-factor justificar acelerar. Antes
disso, capital não compra nada que o tempo não compre — e diluiria pelo preço errado.

---

### Fontes consultadas

- [Preços da WhatsApp Business Platform — Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Faixa de preço por mensagem no Brasil, 2026](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil)
- [Taxas da Sympla para produtores](https://produtores.sympla.com.br/quanto-custa/)
- [VipMe — gestão para casas noturnas](https://vipme.com.br/casas-noturnas-e-produtoras)
- [Powerlist — check-in offline](https://powerlist.com.br/)
