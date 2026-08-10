-- Assinatura da produtora (plano grátis vs Pro).
--
-- Fica numa tabela separada de `orgs`, e não numa coluna dela, por um motivo
-- de segurança: a dona da produtora **precisa** poder editar o nome da org,
-- e uma policy de update em `orgs` que permitisse isso também permitiria
-- escrever o plano. Aqui a separação é estrutural — não existe policy de
-- insert/update/delete pro cliente nesta tabela, então nem o dono da conta
-- consegue se promover pra Pro pelo navegador.
--
-- Quem escreve é o webhook do provedor de pagamento, com a service_role key,
-- que ignora RLS por definição. A cobrança acontece fora do app
-- (docs/business-plan.md §6: checkout no site evita a comissão de 15-30% das
-- lojas de aplicativo).
--
-- Ausência de linha = plano grátis. Assim toda produtora já existente
-- continua funcionando sem backfill.

create table public.org_subscriptions (
  org_id     uuid primary key references public.orgs (id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'pro')),
  -- espelha o estado no provedor: só 'active' concede o Pro de fato
  status     text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  -- fim do período pago: assinatura cancelada vale até o fim do que foi pago
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.org_subscriptions enable row level security;

-- Leitura: só quem é dono da produtora. Escrita: ninguém pelo cliente
-- (sem policy de insert/update/delete, o RLS nega por padrão).
create policy "dona da produtora lê a própria assinatura"
  on public.org_subscriptions for select
  using (public.is_org_owner(org_id));

/**
 * Plano efetivo da produtora, com as regras de vigência aplicadas no banco —
 * o cliente não deve reimplementar isso, e o RLS não deixaria ele confiar no
 * próprio cálculo de qualquer jeito.
 */
create or replace function public.org_plan(target_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.plan
        from public.org_subscriptions s
       where s.org_id = target_org
         and s.plan = 'pro'
         -- cancelada mas dentro do período pago continua valendo
         and (s.status = 'active' or s.current_period_end > now())
    ),
    'free'
  );
$$;
