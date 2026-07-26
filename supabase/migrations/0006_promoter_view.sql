-- Painel do promoter sem login: mesmo padrão de "token secreto na URL" que já
-- usamos pro link de convite. A produtora manda um link com esse token e o
-- promoter vê só o desempenho dele — sem senha, sem conta (docs/melhorias.md #14).

alter table public.promoters
  add column public_token text not null default encode(gen_random_bytes(12), 'hex');
create unique index promoters_public_token_idx on public.promoters (public_token);

create or replace function public.get_promoter_view(p_token text)
returns table (
  promoter_name  text,
  commission_pct numeric,
  active         boolean,
  links_count    bigint,
  opens_count    bigint,
  confirmed_count bigint,
  attended_count bigint,
  revenue        numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.name,
    p.commission_pct,
    p.active,
    count(distinct gl.id),
    coalesce(sum(gl.opens), 0),
    count(distinct g.id) filter (where g.status = 'vou'),
    count(distinct g.id) filter (where c.checked_in_at is not null),
    coalesce(sum(c.amount_paid), 0)
  from public.promoters p
  left join public.guest_links gl on gl.promoter_id = p.id
  left join public.guests g on g.link_code = gl.code and g.event_id = gl.event_id
  left join public.checkins c on c.guest_id = g.id
  where p.public_token = p_token
  group by p.id, p.name, p.commission_pct, p.active;
$$;

revoke all on function public.get_promoter_view(text) from public;
grant execute on function public.get_promoter_view(text) to anon, authenticated;
