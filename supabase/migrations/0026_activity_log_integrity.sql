-- Activity log integrity (audit finding 2.1).
--
-- actor_id and actor_name were ordinary client-supplied columns: any
-- member — including student and parent accounts — could insert rows
-- impersonating anyone ("actor_name: 'Head Teacher'"), poisoning the
-- only audit trail the school has. The app always filled them honestly,
-- but nothing stopped a direct PostgREST insert from lying.
--
-- A trigger now stamps both columns from the caller's session whenever
-- there IS a caller. Service contexts (SQL editor, seed scripts) have no
-- auth.uid() and keep whatever they provide. The table stays append-only
-- for clients: there are no update/delete policies, and that is now
-- documented as intentional.

create or replace function public.stamp_activity_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.actor_id := auth.uid();
    -- "profiles: read own" always lets a user read their own row, so this
    -- lookup works for every role without a definer escalation.
    select nullif(full_name, '') into new.actor_name
    from public.profiles where id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_activity_actor on public.activity_log;
create trigger stamp_activity_actor
  before insert on public.activity_log
  for each row execute function public.stamp_activity_actor();
