-- Galera Pro — organizações, promoters, links rastreáveis, portaria e mensageria.
--
-- Decisão de privacidade importante: telefone e check-in NÃO ficam na tabela
-- `guests`, que é legível por qualquer um com o link do convite. Eles vivem em
-- tabelas separadas (`guest_contacts`, `checkins`) visíveis só pro anfitrião.
-- A mesma query serve os dois papéis: o RLS devolve array vazio pro convidado.

-- ===================== organizações =====================

create table public.orgs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create index orgs_owner_idx on public.orgs (owner_id);

create table public.promoters (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  phone          text,
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create index promoters_org_idx on public.promoters (org_id);

alter table public.events add column org_id       uuid references public.orgs (id) on delete set null;
alter table public.events add column ticket_price numeric(10,2) not null default 0 check (ticket_price >= 0);
alter table public.events add column capacity     integer check (capacity is null or capacity > 0);
create index events_org_idx on public.events (org_id);

-- ===================== links de convidados =====================

create table public.guest_links (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  promoter_id uuid references public.promoters (id) on delete set null,
  code        text not null check (code ~ '^[A-Z0-9]{4,12}$'),
  label       text not null default '' check (char_length(label) <= 80),
  max_uses    integer check (max_uses is null or max_uses > 0),
  opens       integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (event_id, code)
);
create index guest_links_event_idx on public.guest_links (event_id);

-- de qual link a pessoa veio (atribuição do promoter)
alter table public.guests add column link_code text;

-- ===================== dados sensíveis do convidado =====================

create table public.guest_contacts (
  guest_id     uuid primary key references public.guests (id) on delete cascade,
  event_id     uuid not null references public.events (id) on delete cascade,
  phone        text check (phone is null or phone ~ '^[0-9]{12,13}$'),
  wa_opt_in    boolean not null default false,
  -- carimbo do consentimento: é a prova exigida pela LGPD
  wa_opt_in_at timestamptz,
  updated_at   timestamptz not null default now()
);
create index guest_contacts_event_idx on public.guest_contacts (event_id);

-- ===================== portaria =====================

create table public.checkins (
  guest_id      uuid primary key references public.guests (id) on delete cascade,
  event_id      uuid not null references public.events (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  amount_paid   numeric(10,2) not null default 0 check (amount_paid >= 0),
  checked_by    uuid references auth.users (id) on delete set null
);
create index checkins_event_idx on public.checkins (event_id);

-- ===================== fila de mensagens =====================

create table public.outbox_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  to_name    text not null,
  to_phone   text not null,
  kind       text not null check (kind in ('convite','lembrete','enquete','campanha')),
  text       text not null,
  status     text not null default 'pendente' check (status in ('pendente','enviado','falhou')),
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index outbox_event_idx on public.outbox_messages (event_id, created_at);

-- ===================== helpers =====================

create or replace function public.is_org_owner(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orgs o where o.id = target_org and o.owner_id = auth.uid());
$$;

-- Registrar a abertura de um link sem expor a tabela de links pro convidado.
create or replace function public.register_link_open(target_event uuid, link_code text)
returns void language sql volatile security definer set search_path = public as $$
  update public.guest_links
     set opens = opens + 1
   where event_id = target_event and code = link_code and active;
$$;
revoke all on function public.register_link_open(uuid, text) from public;
grant execute on function public.register_link_open(uuid, text) to anon, authenticated;

-- ===================== RLS =====================

alter table public.orgs            enable row level security;
alter table public.promoters       enable row level security;
alter table public.guest_links     enable row level security;
alter table public.guest_contacts  enable row level security;
alter table public.checkins        enable row level security;
alter table public.outbox_messages enable row level security;

create policy "dono lê a própria organização"
  on public.orgs for select using (owner_id = auth.uid());
create policy "criar organização exige sessão"
  on public.orgs for insert with check (auth.uid() is not null and owner_id = auth.uid());
create policy "dono edita a organização"
  on public.orgs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dono apaga a organização"
  on public.orgs for delete using (owner_id = auth.uid());

create policy "dono lê promoters"    on public.promoters for select using (public.is_org_owner(org_id));
create policy "dono cria promoter"   on public.promoters for insert with check (public.is_org_owner(org_id));
create policy "dono edita promoter"  on public.promoters for update using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));
create policy "dono apaga promoter"  on public.promoters for delete using (public.is_org_owner(org_id));

-- links: só o anfitrião enxerga (o convidado usa a RPC acima)
create policy "anfitrião lê links"   on public.guest_links for select using (public.is_event_host(event_id));
create policy "anfitrião cria link"  on public.guest_links for insert with check (public.is_event_host(event_id));
create policy "anfitrião edita link" on public.guest_links for update using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "anfitrião apaga link" on public.guest_links for delete using (public.is_event_host(event_id));

-- contato: o convidado grava o próprio, só o anfitrião lê
create policy "anfitrião lê contatos"      on public.guest_contacts for select using (public.is_event_host(event_id));
create policy "convidado deixa o contato"  on public.guest_contacts for insert with check (true);
create policy "convidado atualiza contato" on public.guest_contacts for update using (true) with check (true);
create policy "anfitrião apaga contato"    on public.guest_contacts for delete using (public.is_event_host(event_id));

-- portaria: exclusivo do anfitrião
create policy "anfitrião lê check-ins"   on public.checkins for select using (public.is_event_host(event_id));
create policy "anfitrião faz check-in"   on public.checkins for insert with check (public.is_event_host(event_id));
create policy "anfitrião edita check-in" on public.checkins for update using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "anfitrião desfaz check-in" on public.checkins for delete using (public.is_event_host(event_id));

-- fila de mensagens: contém telefone, então é só do anfitrião
create policy "anfitrião lê a fila"    on public.outbox_messages for select using (public.is_event_host(event_id));
create policy "anfitrião enfileira"    on public.outbox_messages for insert with check (public.is_event_host(event_id));
create policy "anfitrião atualiza"     on public.outbox_messages for update using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "anfitrião limpa a fila" on public.outbox_messages for delete using (public.is_event_host(event_id));

-- ===================== realtime =====================

alter publication supabase_realtime add table public.guest_links;
alter publication supabase_realtime add table public.checkins;
