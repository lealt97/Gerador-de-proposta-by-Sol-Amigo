-- =========================================================
-- P1: monitoramento operacional mínimo
-- - registra falhas sanitizadas de PDF, checkout e cliente
-- - append-only e sem acesso direto pelo frontend
-- - não armazena payload bruto, tokens ou segredos
-- =========================================================

begin;

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  source text not null,
  event_type text not null,
  severity text not null default 'error',
  request_id text,
  fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint application_events_source_valid check (
    source in ('web', 'pdf', 'billing_checkout', 'billing_webhook_cakto', 'billing_webhook_stripe', 'edge_function')
  ),
  constraint application_events_severity_valid check (severity in ('info', 'warning', 'error', 'critical')),
  constraint application_events_type_format check (event_type ~ '^[a-z0-9_.-]{3,100}$'),
  constraint application_events_request_id_length check (request_id is null or length(request_id) <= 160),
  constraint application_events_fingerprint_length check (fingerprint is null or length(fingerprint) <= 160),
  constraint application_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists application_events_created_idx
  on public.application_events (created_at desc);

create index if not exists application_events_type_created_idx
  on public.application_events (event_type, created_at desc);

create index if not exists application_events_account_created_idx
  on public.application_events (account_id, created_at desc)
  where account_id is not null;

alter table public.application_events enable row level security;

revoke all on table public.application_events
  from public, anon, authenticated, service_role;
grant select, insert on table public.application_events
  to service_role;

create or replace function public.prevent_application_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'application_events_append_only' using errcode = '42501';
end;
$$;

revoke all on function public.prevent_application_event_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists application_events_append_only on public.application_events;
create trigger application_events_append_only
before update or delete on public.application_events
for each row execute function public.prevent_application_event_mutation();

comment on table public.application_events is
  'Eventos operacionais sanitizados e append-only. Payloads brutos, senhas, tokens e segredos são proibidos.';

notify pgrst, 'reload schema';

commit;
