\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'Billing providers test failed: %', message;
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
  'b2000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'billing-providers@solamigo.test',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Billing Providers","company_name":"SolAmigo Providers"}'::jsonb,
  now(),
  now()
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.subscriptions
    where account_id = 'b2000000-0000-4000-8000-000000000001'
      and plan_code = 'free'
      and provider is null
      and provider_customer_id is null
      and provider_subscription_id is null
  ),
  'a conta gratuita foi inicializada com provedor externo'
);

do $$
begin
  begin
    update public.subscriptions
    set provider = 'cakto'
    where account_id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'free_provider_should_fail';
  exception
    when check_violation then null;
  end;
end;
$$;

update public.subscriptions
set plan_code = 'pro',
    billing_interval = 'month',
    status = 'incomplete',
    provider = 'cakto',
    provider_customer_id = 'cakto-customer-001',
    provider_subscription_id = 'cakto-subscription-001'
where account_id = 'b2000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  exists (
    select 1
    from public.subscriptions
    where account_id = 'b2000000-0000-4000-8000-000000000001'
      and plan_code = 'pro'
      and provider = 'cakto'
      and provider_customer_id = 'cakto-customer-001'
      and provider_subscription_id = 'cakto-subscription-001'
  ),
  'a assinatura Pro não aceitou a Cakto como provedora'
);

insert into public.billing_events (
  account_id,
  subscription_id,
  event_type,
  source,
  provider,
  provider_event_id,
  metadata
)
select
  account_id,
  id,
  'provider.integration_tested',
  'provider',
  'cakto',
  'cakto-event-001',
  '{"environment":"test"}'::jsonb
from public.subscriptions
where account_id = 'b2000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  exists (
    select 1
    from public.billing_events
    where provider = 'cakto'
      and provider_event_id = 'cakto-event-001'
  ),
  'o evento da Cakto não foi aceito'
);

do $$
begin
  begin
    update public.subscriptions
    set provider = 'asaas'
    where account_id = 'b2000000-0000-4000-8000-000000000001';
    raise exception 'invalid_subscription_provider_should_fail';
  exception
    when check_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.billing_events (
      account_id,
      event_type,
      source,
      provider,
      provider_event_id
    ) values (
      'b2000000-0000-4000-8000-000000000001',
      'provider.invalid_test',
      'provider',
      'asaas',
      'invalid-provider-event'
    );
    raise exception 'invalid_event_provider_should_fail';
  exception
    when check_violation then null;
  end;
end;
$$;

update public.subscriptions
set provider = 'stripe',
    provider_customer_id = 'cus_test_001',
    provider_subscription_id = 'sub_test_001'
where account_id = 'b2000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  exists (
    select 1
    from public.subscriptions
    where account_id = 'b2000000-0000-4000-8000-000000000001'
      and provider = 'stripe'
      and provider_customer_id = 'cus_test_001'
      and provider_subscription_id = 'sub_test_001'
  ),
  'a assinatura Pro não aceitou a Stripe como provedora'
);

rollback;

select 'Billing providers test passed' as result;
