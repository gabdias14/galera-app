# Lista de melhorias

> **Backlog concluído.** Dos 26 itens abaixo, 23 estão fechados no código. O que sobrou
> (1, 9 e 15) foi transportado para **[docs/roadmap.md](roadmap.md)**, que é o documento
> vivo daqui pra frente. Esta lista fica como registro do que foi feito e por quê.

Backlog priorizado do estado real do código (julho/2026). Cada item traz **por que importa**,
**onde mexer** e um tamanho grosseiro: P (até 1 dia), M (2–5 dias), G (mais de uma semana).

Ordem de leitura: P0 é o que impede lançar; P1 é o que faz crescer; P2 aprofunda o B2B; P3 é
plataforma e dívida técnica.

---

## P0 — Bloqueia o lançamento

### 1. Criar o projeto Supabase e rodar as migrations · P
O código dos dois backends está pronto e testado, mas nenhum projeto existe. Enquanto isso, dois
celulares não veem o mesmo convite — o app é uma demo bonita.
→ `docs/backend.md` passo a passo. É o item que destrava todos os outros.

### 2. O botão "notificar convidados" mente · P
`main.ts:notifyPoll` mostra "🔔 Notificação enviada para N convidados" e não envia nada — só marca a
enquete. Isso é dívida de honestidade com o usuário, não só feature faltando.
→ Trocar o texto por "convidados avisados no app" **ou** ligar na fila do WhatsApp que já existe
(`queueMessages` com `kind: 'enquete'`). Prefira a segunda: o encanamento está pronto.

### 3. Opt-out de WhatsApp ("SAIR") é manual · M
Toda mensagem promete que responder SAIR para o envio, e hoje ninguém processa isso. É promessa não
cumprida e risco de reclamação na ANPD.
→ Enquanto não há webhook, criar botão "descadastrar" na lista de convidados (`views/event.ts`,
aba Convidados) que zera `waOptIn`. Com a Cloud API, vira webhook (`docs/whatsapp.md`).

### 4. Preço, lotação e produtora no formulário de criação · P
O modelo, o banco e as telas Pro já aceitam `ticketPrice`, `capacity` e `orgId`, mas só dá pra criar
rolê Pro por seed ou API. Nenhum organizador real consegue começar.
→ `views/create.ts`: três campos a mais, condicionados a ter organização.

### 5. Política de privacidade e exclusão de dados · M
A App Review exige política publicada, e a LGPD (art. 18) exige que o titular consiga apagar os
dados. Hoje não existe nem uma coisa nem outra.
→ Página estática + ação "apagar meus dados" que remova `guests`, `guest_contacts` e `checkins` do
titular. Ver também o item 20 (papel de operador).

### 6. Editar e apagar rolê pela interface · P
Errou a data? Só refazendo. Falta o básico de um CRUD que o banco já permite (as policies de update
e delete de `events` existem desde a migration 0001).

---

## P1 — O motor de crescimento

### 7. Instrumentar o Recap · M
A tese inteira do produto é o K-factor, e não medimos **nada**: quantos recaps são gerados, quantos
são compartilhados, quantas instalações vieram de um recap. Sem isso, a seção 5 do brief é fé.
→ Eventos `recap_gerado`, `recap_compartilhado` (distinguir `navigator.share` de download) e um
parâmetro de origem no link do recap (`?r=<eventId>`) pra fechar o ciclo na instalação.

### 8. Variações de Recap · M
Hoje existe um layout só. O Wrapped funciona porque tem várias cartelas.
→ "Top 3 do rolê" (quem mais apareceu no ano), "Recap da temporada" (várias edições), "Contagem
regressiva" (pré-evento, que é o que gera convite, não só memória).
`lib/recap.ts` já separa dados (`buildRecapData`) de desenho — é onde entra.

### 9. Deep link e Open Graph · M
O link do convite compartilhado no WhatsApp aparece sem preview. Um card com emoji, título, data e
número de confirmados dobra o clique.
→ Precisa de renderização server-side ou pré-render por evento (Edge Function que devolve `<meta>`).
Combina com Universal Links do `docs/mobile.md`.

### 10. Autoconvite: "quem viu, cria o dele" · P
O recap tem a marca, mas não tem chamada. Quem recebe o convite de um amigo não vê nenhum convite
pra criar o próprio rolê depois que o evento passa.
→ Card na tela do convidado depois do evento: "Curtiu? Cria o seu rolê" — o momento de maior intenção.

### 11. Onboarding do primeiro rolê · M
Hoje a home cai direto no board. Falta o caminho de 30 segundos: template de rolê (aniversário,
churrasco, festa junina) que já vem com emoji, cor e descrição sugerida.

---

## P2 — Aprofundar o B2B

### 12. Portaria offline · G — **o mais importante do bloco**
Casa noturna tem sinal ruim; porta de festa em sítio não tem sinal nenhum. Concorrente direto
(Powerlist) vende "100% offline" como argumento principal. Hoje nossa portaria morre sem rede.
→ O padrão já existe: o `LocalAdapter` prova que a UI roda sobre storage local. O caminho é uma fila
de escrita (IndexedDB) que sincroniza quando a rede volta, com resolução de conflito por
"último check-in vence". É o item que decide se dá pra vender pra casa noturna.

### 13. QR code no check-in · M
Busca por nome resolve até ~200 pessoas; acima disso a fila anda devagar. Os concorrentes todos têm QR.
→ Gerar QR por convidado (o `guest.id` já serve), ler pela câmera com `BarcodeDetector` (ou
`@capacitor-mlkit/barcode-scanning` no app).

### 14. Login de promoter · G
Hoje o promoter recebe o link e não vê nada; só o dono da produtora acompanha. Promoter que enxerga
o próprio número vende mais — é o mesmo princípio de gamificação que os concorrentes usam com ranking.
→ `org_members` com papel (`owner` | `promoter`), reaproveitando `is_org_owner`. Tela reduzida:
meus links, minhas confirmações, minha comissão.

### 15. Venda de ingresso com PIX · G
`amountPaid` hoje é registrado na portaria, não cobrado. Sem cobrar, a receita da produtora não passa
pelo app — e a taxa sobre transação (uma das linhas do plano de negócio) não existe.
→ PIX via PSP (Asaas, Pagar.me, Mercado Pago). Atenção regulatória: recebimento em nome de terceiro
muda a natureza da operação. Comece por PIX direto pro CNPJ da produtora com confirmação manual, que
não exige licença.

### 16. Exportar público e integrar · P
Produtora que testa quer levar a base pra ferramenta dela. Exportar CSV do público (respeitando
opt-in) reduz a percepção de aprisionamento e ajuda a vender.

### 17. Campanha recorrente · M
Hoje a campanha é um disparo manual. O ganho real é a régua: "todo mês, chamar quem é VIP e não vem
há 60 dias". O `outbox` e o score já suportam; falta agendamento.

---

## P3 — Plataforma e dívida técnica

### 18. Testes end-to-end no repositório · P
Os fluxos completos (criar → RSVP → enquete → recap; e todo o Pro) foram verificados por scripts
Playwright que **moram fora do repo** e se perdem. Trazer pra `e2e/`, com `@playwright/test`.

### 19. CI · P
Não existe `.github/workflows`. Nada roda no PR: nem `tsc`, nem os 54 testes, nem o build.
→ Um workflow de 20 linhas resolve.

### 20. LGPD: papéis de controlador e operador · M
Quando a produtora usa o Galera pra tratar o público dela, ela é **controladora** e o Galera é
**operador**. Isso exige contrato de tratamento (DPA) nos termos de uso do Pro, além do registro de
consentimento que já temos. É requisito de venda pra qualquer casa com jurídico.

### 21. Identidade do convidado por token · M
Sem conta, o nome é a identidade: quem tem o link pode alterar o RSVP de outra pessoa. Documentado
como trade-off consciente em `docs/backend.md`, com o caminho pronto (`guest_token` + policy). Vale
subir de prioridade no dia em que um rolê grande for sabotado.

### 22. Fontes locais · P
O app carrega Bricolage/Pacifico do Google Fonts. Sem rede — ou dentro do app instalado — o Recap
sai com fonte de sistema, ou seja, sem identidade de marca justamente na peça de distribuição.
→ Baixar os `.woff2` pro bundle.

### 23. Acessibilidade · M
O app troca `#app.innerHTML` inteiro a cada mudança: leitor de tela perde o contexto e não anuncia
nada. Faltam `aria-live` nas mudanças de estado, foco visível consistente e checagem de contraste
(texto branco sobre coral está no limite).

### 24. Escala da lista de convidados · M
Dois pontos que quebram em rolê grande: `listEvents` no Supabase manda todos os ids conhecidos num
`id.in.(...)` (sem paginação), e a busca da portaria redesenha a tela inteira a cada tecla com todos
os convidados. Medir com 500 convidados antes de vender pra casa de 1.000 pessoas.

### 25. Observabilidade · P
Zero visibilidade de erro em produção. Um Sentry (ou equivalente) e um punhado de eventos de produto
(criou rolê, confirmou, gerou recap) é o mínimo pra saber se o funil funciona.

### 26. Nomes duplicados · P
Dois "João Silva" no mesmo rolê viram a mesma pessoa — o índice único é por nome normalizado. Numa
festa de 300, acontece.
→ Desambiguar na portaria (mostrar telefone/origem do link) e permitir sufixo na hora do RSVP.

---

## Sugestão de sequência

1. **Semana 1–2:** itens 1, 2, 4, 6, 19 — sai da demo, entra em produção com CI.
2. **Semana 3–4:** 3, 5, 20 — conformidade antes de captar base de verdade.
3. **Semana 5–8:** 7, 8, 10, 22 — o loop passa a ser mensurável e bonito.
4. **Em paralelo, se o alvo for casa noturna:** 12 e 13. Sem offline e QR, o pitch B2B trava na
   primeira objeção técnica.
