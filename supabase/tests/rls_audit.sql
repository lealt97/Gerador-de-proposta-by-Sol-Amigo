\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'RLS audit failed: %', message;
  end if;
end;
$$;

-- Toda tabela exposta no schema public deve ter RLS ativo.
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  ),
  'há tabela pública sem RLS ativo'
);

-- Views públicas podem contornar RLS do chamador; nenhuma é esperada neste projeto.
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('v', 'm')
  ),
  'há view pública não auditada'
);

-- Tabelas de propriedade do usuário precisam cobrir CRUD completo.
with expected(table_name, command) as (
  values
    ('clients','SELECT'), ('clients','INSERT'), ('clients','UPDATE'), ('clients','DELETE'),
    ('proposals','SELECT'), ('proposals','INSERT'), ('proposals','UPDATE'), ('proposals','DELETE'),
    ('proposal_loads','SELECT'), ('proposal_loads','INSERT'), ('proposal_loads','UPDATE'), ('proposal_loads','DELETE'),
    ('solar_system_calculations','SELECT'), ('solar_system_calculations','INSERT'), ('solar_system_calculations','UPDATE'), ('solar_system_calculations','DELETE'),
    ('solar_kits','SELECT'), ('solar_kits','INSERT'), ('solar_kits','UPDATE'), ('solar_kits','DELETE'),
    ('pdf_templates','SELECT'), ('pdf_templates','INSERT'), ('pdf_templates','UPDATE'), ('pdf_templates','DELETE'),
    ('pdf_user_models','SELECT'), ('pdf_user_models','INSERT'), ('pdf_user_models','UPDATE'), ('pdf_user_models','DELETE')
), missing as (
  select e.*
  from expected e
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = e.table_name
      and p.cmd = e.command
  )
)
select pg_temp.assert_true(
  not exists (select 1 from missing),
  'falta política CRUD em tabela pertencente ao usuário'
);

-- Todas as políticas das tabelas privadas precisam vincular o acesso ao auth.uid().
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (
        'profiles', 'clients', 'proposals', 'proposal_loads',
        'solar_system_calculations', 'solar_kits',
        'pdf_templates', 'pdf_user_models', 'proposal_events',
        'subscriptions', 'billing_events', 'account_usage',
        'billing_checkout_sessions', 'account_legal_acceptances',
        'beta_feedback'
      )
      and concat_ws(' ', p.qual, p.with_check) not ilike '%auth.uid()%'
  ),
  'há política privada sem vínculo com auth.uid()'
);

-- Perfil não pode ser excluído diretamente; exclusão completa passa pela Edge Function.
select pg_temp.assert_true(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'INSERT'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'UPDATE'
  )
  and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'DELETE'
  ),
  'políticas de profiles não correspondem ao fluxo de conta'
);

-- Eventos são append-only para preservar as trilhas de auditoria.
select pg_temp.assert_true(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'proposal_events' and cmd = 'SELECT'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'proposal_events' and cmd = 'INSERT'
  )
  and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'proposal_events' and cmd in ('UPDATE','DELETE')
  )
  and not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in (
        'mfa_security_events', 'billing_events', 'application_events',
        'admin_audit_logs', 'account_legal_acceptances'
      )
      and cmd in ('INSERT','UPDATE','DELETE')
  ),
  'uma tabela de eventos ou aceites deixou de ser append-only para a API'
);

-- Catálogos globais são somente leitura pela API.
select pg_temp.assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in (
        'pdf_cover_templates', 'pdf_template_presets', 'billing_plans',
        'legal_document_versions'
      )
      and cmd <> 'SELECT'
  ),
  'catálogo global possui política de escrita'
);

-- Sequências são internas: sem políticas e sem grants diretos para a API.
select pg_temp.assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'proposal_sequences'
  )
  and not has_table_privilege('anon', 'public.proposal_sequences', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.proposal_sequences', 'SELECT,INSERT,UPDATE,DELETE'),
  'proposal_sequences possui acesso direto pela API'
);

-- Tabelas privadas de cobrança, administração e monitoramento não aceitam escrita direta.
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.subscriptions', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.billing_events', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.account_usage', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.billing_checkout_sessions', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.application_events', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.platform_admins', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.admin_audit_logs', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.account_legal_acceptances', 'INSERT,UPDATE,DELETE'),
  'uma tabela privada possui acesso direto indevido pela API'
);

-- Toda função SECURITY DEFINER deve fixar search_path.
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) config
        where config like 'search_path=%'
      )
  ),
  'há função SECURITY DEFINER com search_path mutável'
);

-- Funções internas e de gatilho não devem ser executáveis diretamente pela API.
with internal(signature) as (
  values
    ('public.handle_new_proposal()'),
    ('public.handle_new_user()'),
    ('public.handle_updated_at()'),
    ('public.set_updated_at()'),
    ('public.set_billing_updated_at()'),
    ('public.handle_new_billing_account()'),
    ('public.initialize_billing_account(uuid)'),
    ('public.audit_mfa_factor_state_change()'),
    ('public.reserve_proposal_quota()'),
    ('public.prevent_application_event_mutation()'),
    ('public.record_signup_legal_acceptances()'),
    ('public.prevent_admin_audit_mutation()')
), resolved as (
  select signature, to_regprocedure(signature) as function_oid
  from internal
)
select pg_temp.assert_true(
  not exists (
    select 1 from resolved
    where function_oid is not null
      and (
        has_function_privilege('anon', function_oid, 'EXECUTE')
        or has_function_privilege('authenticated', function_oid, 'EXECUTE')
      )
  ),
  'função interna pode ser chamada diretamente pela API'
);

-- RPCs autenticadas de leitura ou ação própria têm privilégios explícitos.
with authenticated_rpc(signature) as (
  values
    ('public.is_proposal_owner(uuid)'),
    ('public.get_my_proposal_quota()'),
    ('public.get_my_legal_status()'),
    ('public.accept_current_legal_documents()'),
    ('public.get_my_onboarding_status()')
), resolved as (
  select signature, to_regprocedure(signature) as function_oid
  from authenticated_rpc
)
select pg_temp.assert_true(
  not exists (
    select 1 from resolved
    where function_oid is not null
      and (
        has_function_privilege('anon', function_oid, 'EXECUTE')
        or not has_function_privilege('authenticated', function_oid, 'EXECUTE')
      )
  ),
  'permissões das RPCs autenticadas estão incorretas'
);

-- A exclusão legada é exclusiva da service_role; o usuário usa a Edge Function completa.
select pg_temp.assert_true(
  to_regprocedure('public.delete_user_account()') is not null
  and not has_function_privilege('anon', to_regprocedure('public.delete_user_account()'), 'EXECUTE')
  and not has_function_privilege('authenticated', to_regprocedure('public.delete_user_account()'), 'EXECUTE')
  and has_function_privilege('service_role', to_regprocedure('public.delete_user_account()'), 'EXECUTE'),
  'a RPC legada de exclusão continua exposta à API'
);

-- RPCs internas versionadas têm privilégios explícitos.
select pg_temp.assert_true(
  to_regprocedure('public.save_proposal_bundle(uuid,bigint,jsonb,jsonb,jsonb,text,text)') is not null
  and not has_function_privilege(
    'anon',
    to_regprocedure('public.save_proposal_bundle(uuid,bigint,jsonb,jsonb,jsonb,text,text)'),
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    to_regprocedure('public.save_proposal_bundle(uuid,bigint,jsonb,jsonb,jsonb,text,text)'),
    'EXECUTE'
  )
  and to_regprocedure('public.next_proposal_code()') is not null
  and not has_function_privilege('anon', to_regprocedure('public.next_proposal_code()'), 'EXECUTE')
  and not has_function_privilege('authenticated', to_regprocedure('public.next_proposal_code()'), 'EXECUTE'),
  'permissões das RPCs internas versionadas estão incorretas'
);

-- O processador de eventos de cobrança é exclusivo da service_role.
select pg_temp.assert_true(
  to_regprocedure('public.apply_billing_provider_event(text,text,text,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb)') is not null
  and not has_function_privilege(
    'anon',
    to_regprocedure('public.apply_billing_provider_event(text,text,text,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb)'),
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    to_regprocedure('public.apply_billing_provider_event(text,text,text,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb)'),
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    to_regprocedure('public.apply_billing_provider_event(text,text,text,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb)'),
    'EXECUTE'
  ),
  'processador de eventos de cobrança está exposto à API pública'
);

-- O fluxo público atual por token precisa continuar acessível sem login.
with required_public_rpc(signature) as (
  values
    ('public.get_public_proposal(text)'),
    ('public.update_public_proposal_status(text,text,text,text,text)')
), resolved as (
  select signature, to_regprocedure(signature) as function_oid
  from required_public_rpc
)
select pg_temp.assert_true(
  not exists (
    select 1 from resolved
    where function_oid is null
       or not has_function_privilege('anon', function_oid, 'EXECUTE')
  ),
  'uma RPC pública versionada deixou de ser acessível'
);

-- RPCs públicas legadas são preservadas quando existirem na instalação.
with optional_public_rpc(signature) as (
  values
    ('public.mark_public_proposal_viewed(text)'),
    ('public.accept_public_proposal(text)'),
    ('public.reject_public_proposal(text,text)')
), resolved as (
  select signature, to_regprocedure(signature) as function_oid
  from optional_public_rpc
)
select pg_temp.assert_true(
  not exists (
    select 1 from resolved
    where function_oid is not null
      and not has_function_privilege('anon', function_oid, 'EXECUTE')
  ),
  'uma RPC pública legada existente deixou de ser acessível'
);

select 'RLS audit passed' as result;
