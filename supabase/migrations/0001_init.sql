-- Galera — schema inicial
-- Modelo de acesso: o link do convite é a chave. O id do rolê é um uuid
-- aleatório; quem tem o link lê o rolê e responde. Escrever coisas de
-- anfitrião (mural, enquete, apagar) exige ser o dono do evento.

create extension if not exists pgcrypto;

-- ===================== tabelas =====================

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid references auth.users (id) on delete set null,
  emoji       text        not null default '🎉',
  title       text        not null check (char_length(title) between 1 and 120),
  date        date        not null,
  time        time        not null,
  location    text        not null check (char_length(location) <= 200),
  description text        not null default '' check (char_length(description) <= 2000),
  color       text        not null default 'coral' check (color in ('coral','yellow','green','purple')),
  pix         text        not null default '' check (char_length(pix) <= 140),
  created_at  timestamptz not null default now()
);
create index events_host_id_idx on public.events (host_id);

create table public.guests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  -- chave de deduplicação: "Ana Silva" e "ana silva" são a mesma pessoa
  name_key   text generated always as (lower(btrim(name))) stored,
  status     text not null check (status in ('vou','talvez','nao')),
  created_at timestamptz not null default now(),
  unique (event_id, name_key)
);
create index guests_event_id_idx on public.guests (event_id);

create table public.mural_posts (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  text       text not null check (char_length(btrim(text)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index mural_posts_event_id_idx on public.mural_posts (event_id, created_at desc);

create table public.polls (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  question   text not null check (char_length(btrim(question)) between 1 and 200),
  notified   boolean not null default false,
  created_at timestamptz not null default now()
);
create index polls_event_id_idx on public.polls (event_id, created_at desc);

create table public.poll_options (
  id       uuid primary key default gen_random_uuid(),
  poll_id  uuid not null references public.polls (id) on delete cascade,
  -- desnormalizado de propósito: simplifica RLS e o filtro do realtime
  event_id uuid not null references public.events (id) on delete cascade,
  text     text not null check (char_length(btrim(text)) between 1 and 100),
  position smallint not null default 0
);
create index poll_options_poll_id_idx on public.poll_options (poll_id, position);
create index poll_options_event_id_idx on public.poll_options (event_id);

create table public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  option_id  uuid not null references public.poll_options (id) on delete cascade,
  voter_name text not null check (char_length(btrim(voter_name)) between 1 and 60),
  voter_key  text generated always as (lower(btrim(voter_name))) stored,
  created_at timestamptz not null default now(),
  -- um voto por pessoa por enquete (trocar de opção = update)
  unique (poll_id, voter_key)
);
create index poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index poll_votes_event_id_idx on public.poll_votes (event_id);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  url          text not null,
  caption      text not null default '' check (char_length(caption) <= 200),
  uploader     text not null default '' check (char_length(uploader) <= 60),
  created_at   timestamptz not null default now()
);
create index photos_event_id_idx on public.photos (event_id, created_at);

-- ===================== helpers =====================

-- Anfitrião do rolê. `stable` + security definer pra poder ser usada dentro das policies.
create or replace function public.is_event_host(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event
      and e.host_id is not null
      and e.host_id = auth.uid()
  );
$$;

-- O álbum só abre no dia do rolê (mesma regra da UI, garantida no banco).
create or replace function public.event_album_open(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event
      and e.date <= (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

-- ===================== RLS =====================

alter table public.events       enable row level security;
alter table public.guests       enable row level security;
alter table public.mural_posts  enable row level security;
alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;
alter table public.photos       enable row level security;

-- events: leitura por link (id é uuid aleatório), escrita só do anfitrião
create policy "events são legíveis por quem tem o link"
  on public.events for select using (true);
create policy "criar rolê exige sessão"
  on public.events for insert with check (auth.uid() is not null and host_id = auth.uid());
create policy "só o anfitrião edita o rolê"
  on public.events for update using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "só o anfitrião apaga o rolê"
  on public.events for delete using (host_id = auth.uid());

-- guests: qualquer convidado com o link responde e altera a própria resposta.
-- Trade-off consciente do MVP: sem conta, o nome é a única identidade.
-- Endurecer depois com token por convidado (ver docs/backend.md).
create policy "lista de convidados é pública no rolê"
  on public.guests for select using (true);
create policy "convidado responde ao convite"
  on public.guests for insert with check (true);
create policy "convidado altera a própria resposta"
  on public.guests for update using (true) with check (true);
create policy "só o anfitrião remove convidado"
  on public.guests for delete using (public.is_event_host(event_id));

-- mural: leitura pública, escrita só do anfitrião
create policy "mural é público no rolê"
  on public.mural_posts for select using (true);
create policy "só o anfitrião posta no mural"
  on public.mural_posts for insert with check (public.is_event_host(event_id));
create policy "só o anfitrião edita o mural"
  on public.mural_posts for update using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "só o anfitrião apaga do mural"
  on public.mural_posts for delete using (public.is_event_host(event_id));

-- enquetes: criadas pelo anfitrião, votadas por todos
create policy "enquetes são públicas no rolê"
  on public.polls for select using (true);
create policy "só o anfitrião cria enquete"
  on public.polls for insert with check (public.is_event_host(event_id));
create policy "só o anfitrião edita enquete"
  on public.polls for update using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "só o anfitrião apaga enquete"
  on public.polls for delete using (public.is_event_host(event_id));

create policy "opções são públicas no rolê"
  on public.poll_options for select using (true);
create policy "só o anfitrião cria opção"
  on public.poll_options for insert with check (public.is_event_host(event_id));
create policy "só o anfitrião apaga opção"
  on public.poll_options for delete using (public.is_event_host(event_id));

create policy "votos são públicos no rolê"
  on public.poll_votes for select using (true);
create policy "convidado vota"
  on public.poll_votes for insert with check (true);
create policy "convidado troca o próprio voto"
  on public.poll_votes for update using (true) with check (true);
create policy "só o anfitrião apaga voto"
  on public.poll_votes for delete using (public.is_event_host(event_id));

-- fotos: só depois que o rolê acontece
create policy "álbum é público no rolê"
  on public.photos for select using (true);
create policy "fotos só depois do rolê"
  on public.photos for insert with check (public.event_album_open(event_id));
create policy "só o anfitrião apaga foto"
  on public.photos for delete using (public.is_event_host(event_id));

-- ===================== realtime =====================

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.guests;
alter publication supabase_realtime add table public.mural_posts;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_options;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.photos;

-- ===================== storage =====================

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

create policy "fotos do rolê são públicas"
  on storage.objects for select
  using (bucket_id = 'event-photos');

create policy "convidado sobe foto do rolê"
  on storage.objects for insert
  with check (bucket_id = 'event-photos');
