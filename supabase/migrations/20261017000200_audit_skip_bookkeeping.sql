-- Activity log: skip updates that only touch bookkeeping columns (updated_at, last_activity_at,
-- search_vector). Adding a note to a lead bumps last_activity_at, which otherwise logs an
-- "updated" entry with no visible change.

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  bookkeeping text[] := array['updated_at', 'last_activity_at', 'search_vector'];
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - bookkeeping) = (to_jsonb(new) - bookkeeping) then
    return new;
  end if;
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
