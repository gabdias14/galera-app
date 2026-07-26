-- Instrumentação do loop de crescimento (docs/melhorias.md #7 e #25).
--
-- Sem isso, a tese de crescimento inteira ("o Recap circula sozinho") é fé,
-- não medição. `product_events` é escrita por qualquer um (até anônimo —
-- quem abre um convite pode não ter sessão), leitura só do anfitrião do rolê.

create table public.product_events (
  id         uuid primary key default gen_random_uuid(),
  -- null quando o evento não é sobre um rolê específico (ex.: app_aberto)
  event_id   uuid references public.events (id) on delete cascade,
  name       text not null check (char_length(name) <= 60),
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index product_events_event_idx on public.product_events (event_id);
create index product_events_name_idx on public.product_events (name, created_at);

alter table public.product_events enable row level security;

create policy "qualquer um grava evento de produto"
  on public.product_events for insert with check (true);

create policy "anfitrião lê os eventos do próprio rolê"
  on public.product_events for select
  using (event_id is null or public.is_event_host(event_id));
