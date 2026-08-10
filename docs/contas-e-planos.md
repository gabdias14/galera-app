# Contas e planos

Como o Galera sabe quem é você e o que você pode usar.

---

## 1. A regra que não se quebra: convidado não faz conta

Abrir um convite e responder continua sendo **um clique, sem cadastro**. Isso
não é comodidade — é a tese de distribuição do produto. O convite circula no
WhatsApp porque quem recebe não esbarra em nada; qualquer fricção aí derruba o
K-factor, que é a métrica que sustenta o plano inteiro
(`docs/business-plan.md` §11).

A tela de acesso (`#/entrar`) é **opcional e só interessa a quem organiza**.
Nenhum caminho do convidado passa por ela, e há um teste end-to-end
(`e2e/conta.spec.ts`) que existe só pra garantir isso continuar verdade.

---

## 2. Três estados de identidade

| Estado | Como acontece | O que a pessoa tem |
| --- | --- | --- |
| **Anônimo** | Padrão. Todo mundo começa aqui | Cria rolês, responde convites. Tudo preso a este aparelho |
| **Identificado** | Pediu o link por e-mail e clicou nele | Os mesmos rolês, agora recuperáveis em qualquer aparelho |
| **Com assinatura** | A produtora dela tem plano Pro ativo | Campanha, promoters, portaria e exportação |

No Supabase o estado anônimo é uma sessão de verdade (`signInAnonymously`),
não a ausência de sessão — é o que dá ao anfitrião um `host_id` estável pro
RLS funcionar sem tela de login.

### O detalhe que evita perda de dados

Quando alguém anônimo se identifica, o app chama `updateUser({ email })`, que
**vincula o e-mail ao usuário que já existe**. O id continua o mesmo, então os
rolês continuam dela.

Criar um usuário novo nessa hora seria a forma mais fácil de fazer alguém
perder tudo o que criou — e é o comportamento padrão de quem implementa isso
sem pensar. Se o e-mail já pertencer a outra conta, aí sim é login de verdade
(`signInWithOtp`) e a sessão troca: a pessoa está entrando na conta dela.

---

## 3. Onde mora a verdade sobre o plano

**No banco, e o cliente não escreve nela.**

A assinatura vive em `public.org_subscriptions`
(`supabase/migrations/0008_assinatura.sql`), numa tabela separada de `orgs`. A
separação é estrutural, não cosmética: a dona da produtora precisa poder editar
o nome da org, e uma policy de update em `orgs` que permitisse isso também
permitiria escrever o plano. Numa tabela própria sem nenhuma policy de escrita,
o RLS nega por padrão — nem o dono da conta se promove pra Pro pelo navegador.

Quem escreve é o webhook do provedor de pagamento, usando a `service_role` key,
que ignora RLS por definição.

**Ausência de linha = plano grátis.** Assim nenhuma produtora existente precisa
de backfill, e o padrão seguro é o menos permissivo.

### Vigência

A função `public.org_plan()` aplica a regra: assinatura cancelada continua
valendo até o fim do período pago. O cliente tem um espelho dessa lógica
(`effectivePlan` em `src/data/supabase.ts`) só pra desenhar a tela sem uma ida
extra ao servidor — mas o banco é a fonte da verdade, e o RLS não deixaria o
cliente confiar no próprio cálculo de qualquer forma.

---

## 4. O que é grátis e o que é Pro

Está tudo em **`src/lib/plan.ts`** — é o único lugar do código que decide isso.
Mudar a régua comercial é mexer nesse arquivo, em nenhum outro.

A régua atual: **no grátis a produtora vê o valor, no Pro ela age.**

| | Grátis | Pro |
| --- | --- | --- |
| Painel com KPIs | ✅ | ✅ |
| Score de público (base pontuada) | ✅ | ✅ |
| Campanha com link rastreável | 🔒 | ✅ |
| Promoters e comissão | 🔒 | ✅ |
| Portaria e check-in | 🔒 | ✅ |
| Exportar CSV | 🔒 | ✅ |

O painel e o score ficam abertos de propósito: são o argumento de venda. A
produtora precisa olhar a **própria base pontuada** pra entender o que está
comprando — é a mesma lógica do `marketing-plan.md`, onde o pitch é "olha quem
já está aqui", não "compre um software".

---

## 5. Por que o checkout é fora do app

O botão "Ver planos" abre o navegador. Sempre.

Cobrar dentro do app Android/iOS acionaria a comissão de **15–30%** da loja
(`docs/business-plan.md` §6). Com ARPU de R$ 229 e margem bruta acima de 90%,
essa comissão é a diferença entre o modelo funcionar e não funcionar.

A regra prática, que vale pra qualquer coisa que se venda daqui pra frente: o
app pode **avisar** que existe um plano pago, nunca **processar** o pagamento.
Um link que abre o navegador está fora do escopo da política das lojas; um
checkout embutido numa WebView do próprio app, não.

---

## 6. Modo local (demo)

Sem `VITE_SUPABASE_URL`, o app roda no `LocalAdapter`, e aí:

- a "sessão" é um registro no próprio aparelho — serve pra desenvolver e pra
  demonstrar o fluxo, não valida e-mail nenhum;
- a produtora de exemplo nasce no **Pro**, pra demonstração mostrar o produto
  inteiro funcionando;
- existe um **alternador de plano** no topo da área Pro que troca entre grátis
  e Pro na hora, pra mostrar as duas experiências numa reunião.

Esse alternador só existe no modo local (`state.backend !== 'local'` devolve
string vazia) e a operação por trás dele — `setLocalPlan` — nem existe no
adaptador do Supabase.

---

## 7. O que falta

- **Webhook do provedor de pagamento** que escreve em `org_subscriptions`.
  Depende de escolher o PSP e de ter o CNPJ aberto
  (`docs/startup/estrutura-juridica.md`).
- **Página `/assinar`** no site, que é pra onde o CTA aponta hoje.
- **Limite do plano grátis por volume.** `FREE_EVENT_LIMIT` já existe em
  `src/lib/plan.ts` mas ainda não é aplicado em lugar nenhum — decidir depois de
  ver gente usando se o limite certo é por rolê, por contato ou nenhum.
