-- Divisão de custos do rolê ("quem comprou o quê, quem deve pra quem").
--
-- No churrasco cada um compra uma coisa e no fim ninguém sabe quem está no
-- vermelho. O rateio em si é calculado no cliente (src/lib/split.ts) — aqui
-- só guardamos os lançamentos, que é o dado que precisa ser compartilhado.
--
-- Quem escreve: qualquer um com o link. É intencional e casa com a dinâmica
-- real — quem comprou é quem sabe o valor, e obrigar tudo a passar pelo
-- anfitrião recria a planilha que estamos substituindo. Apagar continua
-- sendo só do anfitrião, que é quem modera.

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 1 and 80),
  -- dinheiro em numeric, nunca float: 0.1 + 0.2 <> 0.3
  amount      numeric(10,2) not null check (amount > 0 and amount <= 1000000),
  paid_by     text not null check (char_length(btrim(paid_by)) between 1 and 60),
  -- vazio = todo mundo que confirmou presença (resolvido no cliente)
  shared_with text[] not null default '{}'::text[] check (array_length(shared_with, 1) is null or array_length(shared_with, 1) <= 200),
  created_at  timestamptz not null default now()
);
create index expenses_event_idx on public.expenses (event_id, created_at desc);

alter table public.expenses enable row level security;

create policy "despesas são públicas no rolê"
  on public.expenses for select using (true);

create policy "qualquer um com o link lança despesa"
  on public.expenses for insert with check (true);

create policy "só o anfitrião apaga despesa"
  on public.expenses for delete using (public.is_event_host(event_id));

create policy "só o anfitrião edita despesa"
  on public.expenses for update
  using (public.is_event_host(event_id))
  with check (public.is_event_host(event_id));
