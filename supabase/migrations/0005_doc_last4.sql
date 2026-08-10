-- Últimos 4 dígitos de CPF/RG, opcional — desempata homônimo na portaria
-- offline sem guardar o documento inteiro (docs/melhorias.md #12, decisão
-- tomada com o time: minimizar o dado em vez de armazenar o CPF completo).
--
-- Fica em guest_contacts, não em guests: mesmo compartimento host-only onde
-- já vive telefone e consentimento de WhatsApp.

alter table public.guest_contacts
  add column doc_last4 text check (doc_last4 is null or doc_last4 ~ '^[0-9]{4}$');

create or replace function public.rsvp_upsert(
  target_event uuid,
  guest_name   text,
  guest_status text,
  guest_phone  text default null,
  opt_in       boolean default false,
  link_code    text default null,
  token        text default null,
  doc_last4    text default null
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

  if guest_phone is not null or opt_in or doc_last4 is not null then
    insert into public.guest_contacts (guest_id, event_id, phone, wa_opt_in, wa_opt_in_at, doc_last4, updated_at)
    values (new_id, target_event, guest_phone, opt_in,
            case when opt_in then now() else null end, doc_last4, now())
    on conflict (guest_id) do update
      set phone        = excluded.phone,
          wa_opt_in    = excluded.wa_opt_in,
          wa_opt_in_at = excluded.wa_opt_in_at,
          doc_last4    = coalesce(excluded.doc_last4, public.guest_contacts.doc_last4),
          updated_at   = now();
  end if;

  return query select new_id, new_token;
end;
$$;

revoke all on function public.rsvp_upsert(uuid, text, text, text, boolean, text, text, text) from public;
grant execute on function public.rsvp_upsert(uuid, text, text, text, boolean, text, text, text) to anon, authenticated;
