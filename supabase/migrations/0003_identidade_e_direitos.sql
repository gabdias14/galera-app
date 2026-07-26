-- Identidade do convidado, direito de exclusão e edição de rolê.
--
-- Fecha o buraco documentado na 0001: as policies de guests permitiam que
-- qualquer um com o link alterasse a resposta alheia digitando o nome da
-- pessoa. Agora toda escrita em `guests` passa por uma função que exige o
-- token emitido na primeira resposta.

alter table public.guests add column guest_token text;

-- ===================== RSVP com token =====================

/**
 * Cria ou atualiza a resposta de um convidado.
 *
 * - nome livre na primeira vez: emite e devolve um token
 * - nas seguintes, só passa quem apresenta o token daquele nome
 * - nome já tomado por outra pessoa levanta 'name_taken', que a interface
 *   traduz em "adicione seu sobrenome" (também resolve homônimo)
 */
create or replace function public.rsvp_upsert(
  target_event uuid,
  guest_name   text,
  guest_status text,
  guest_phone  text default null,
  opt_in       boolean default false,
  link_code    text default null,
  token        text default null
)
returns table (guest_id uuid, guest_token text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing   public.guests%rowtype;
  new_token  text;
  new_id     uuid;
begin
  if guest_status not in ('vou','talvez','nao') then
    raise exception 'invalid_status';
  end if;
  if char_length(btrim(guest_name)) < 1 then
    raise exception 'empty_name';
  end if;

  select * into existing
    from public.guests g
   where g.event_id = target_event
     and g.name_key = lower(btrim(guest_name));

  if found then
    if existing.guest_token is not null and existing.guest_token is distinct from token then
      raise exception 'name_taken';
    end if;
    new_token := coalesce(existing.guest_token, token, gen_random_uuid()::text);
    update public.guests g
       set status      = guest_status,
           name        = guest_name,
           guest_token = new_token,
           link_code   = coalesce(g.link_code, link_code)
     where g.id = existing.id;
    new_id := existing.id;
  else
    new_token := coalesce(token, gen_random_uuid()::text);
    insert into public.guests (event_id, name, status, link_code, guest_token)
    values (target_event, guest_name, guest_status, link_code, new_token)
    returning id into new_id;
  end if;

  if guest_phone is not null or opt_in then
    insert into public.guest_contacts (guest_id, event_id, phone, wa_opt_in, wa_opt_in_at, updated_at)
    values (new_id, target_event, guest_phone, opt_in,
            case when opt_in then now() else null end, now())
    on conflict (guest_id) do update
      set phone        = excluded.phone,
          wa_opt_in    = excluded.wa_opt_in,
          wa_opt_in_at = excluded.wa_opt_in_at,
          updated_at   = now();
  end if;

  return query select new_id, new_token;
end;
$$;

revoke all on function public.rsvp_upsert(uuid, text, text, text, boolean, text, text) from public;
grant execute on function public.rsvp_upsert(uuid, text, text, text, boolean, text, text) to anon, authenticated;

-- Escrita direta em guests/guest_contacts sai de cena: só a função acima.
drop policy if exists "convidado responde ao convite"       on public.guests;
drop policy if exists "convidado altera a própria resposta" on public.guests;
drop policy if exists "convidado deixa o contato"           on public.guest_contacts;
drop policy if exists "convidado atualiza contato"          on public.guest_contacts;

-- ===================== direito de exclusão (LGPD art. 18) =====================

/**
 * Apaga o convidado e tudo que é dele. Aceita quem prova ser o titular
 * (token) ou o anfitrião do rolê.
 */
create or replace function public.forget_guest(
  target_event uuid,
  target_guest uuid,
  token        text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
begin
  select * into g from public.guests where id = target_guest and event_id = target_event;
  if not found then
    return;
  end if;
  if not public.is_event_host(target_event)
     and (g.guest_token is null or g.guest_token is distinct from token) then
    raise exception 'not_allowed';
  end if;

  delete from public.poll_votes where event_id = target_event and voter_key = g.name_key;
  delete from public.outbox_messages where event_id = target_event and lower(btrim(to_name)) = g.name_key;
  -- guest_contacts e checkins caem por cascade
  delete from public.guests where id = target_guest;
end;
$$;

revoke all on function public.forget_guest(uuid, uuid, text) from public;
grant execute on function public.forget_guest(uuid, uuid, text) to anon, authenticated;

/** Desligar o WhatsApp ("SAIR") sem apagar a presença. */
create or replace function public.set_guest_consent(
  target_event uuid,
  target_guest uuid,
  opt_in       boolean,
  token        text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
begin
  select * into g from public.guests where id = target_guest and event_id = target_event;
  if not found then
    return;
  end if;
  if not public.is_event_host(target_event)
     and (g.guest_token is null or g.guest_token is distinct from token) then
    raise exception 'not_allowed';
  end if;

  update public.guest_contacts
     set wa_opt_in    = opt_in,
         wa_opt_in_at = case when opt_in then now() else null end,
         phone        = case when opt_in then phone else null end,
         updated_at   = now()
   where guest_id = target_guest;
end;
$$;

revoke all on function public.set_guest_consent(uuid, uuid, boolean, text) from public;
grant execute on function public.set_guest_consent(uuid, uuid, boolean, text) to anon, authenticated;
