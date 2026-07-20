-- Preserva trilhas de auditoria após exclusão da conta sem permitir
-- alterações de conteúdo. As únicas atualizações aceitas são as
-- nulificações produzidas pelas FKs ON DELETE SET NULL.
begin;

create or replace function public.prevent_application_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.account_id is not null
     and new.account_id is null
     and new.source is not distinct from old.source
     and new.event_type is not distinct from old.event_type
     and new.severity is not distinct from old.severity
     and new.request_id is not distinct from old.request_id
     and new.fingerprint is not distinct from old.fingerprint
     and new.metadata is not distinct from old.metadata
     and new.created_at is not distinct from old.created_at then
    return new;
  end if;

  raise exception 'application_events_append_only' using errcode = '42501';
end;
$$;

revoke all on function public.prevent_application_event_mutation()
  from public, anon, authenticated, service_role;

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and (new.actor_id is null or new.actor_id is not distinct from old.actor_id)
     and (new.target_account_id is null or new.target_account_id is not distinct from old.target_account_id)
     and (
       (old.actor_id is not null and new.actor_id is null)
       or (old.target_account_id is not null and new.target_account_id is null)
     )
     and new.actor_role is not distinct from old.actor_role
     and new.action is not distinct from old.action
     and new.reason is not distinct from old.reason
     and new.metadata is not distinct from old.metadata
     and new.created_at is not distinct from old.created_at then
    return new;
  end if;

  raise exception 'admin_audit_logs_append_only' using errcode = '42501';
end;
$$;

revoke all on function public.prevent_admin_audit_mutation()
  from public, anon, authenticated, service_role;

commit;
