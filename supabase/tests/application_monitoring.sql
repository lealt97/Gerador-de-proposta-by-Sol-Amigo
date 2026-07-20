\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Application monitoring test failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'b5000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'monitoring@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Monitoring Owner"}'::jsonb,
  now(),
  now()
);

set local role service_role;

insert into public.application_events (
  account_id,
  source,
  event_type,
  severity,
  request_id,
  fingerprint,
  metadata
) values (
  'b5000000-0000-4000-8000-000000000001',
  'pdf',
  'pdf.generation_failed',
  'error',
  'request-monitoring-0001',
  'pdf.generation_failed',
  '{"error_code":"pdf_invalid","proposal_id":"safe-id"}'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.application_events event
    where event.account_id = 'b5000000-0000-4000-8000-000000000001'
      and event.event_type = 'pdf.generation_failed'
      and event.metadata ->> 'error_code' = 'pdf_invalid'
  ),
  'service_role não conseguiu inserir evento sanitizado'
);

reset role;

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.application_events', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.application_events', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.application_events', 'SELECT,INSERT')
  and not has_table_privilege('service_role', 'public.application_events', 'UPDATE,DELETE'),
  'privilégios da trilha operacional estão incorretos'
);

do $$
begin
  update public.application_events
  set severity = 'warning'
  where request_id = 'request-monitoring-0001';
  raise exception 'evento de monitoramento pôde ser alterado';
exception
  when insufficient_privilege then
    null;
end;
$$;

do $$
begin
  delete from public.application_events
  where request_id = 'request-monitoring-0001';
  raise exception 'evento de monitoramento pôde ser excluído';
exception
  when insufficient_privilege then
    null;
end;
$$;

rollback;

\echo 'Application monitoring test passed'
