-- =========================================================
-- P1: checkout idempotente e eventos de assinatura
-- - tentativas de checkout ficam auditáveis e isoladas por conta
-- - eventos dos provedores são aplicados uma única vez
-- - mudanças de plano/status só podem ser escritas pelo servidor
-- =========================================================

begin;

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  billing_interval text not null,
  idempotency_key text not null,
  provider_session_id text,
  checkout_url text not null,
  status text not null default 'created',
  expires_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_provider_valid check (provider in ('cakto', 'stripe')),
  constraint billing_checkout_interval_valid check (billing_interval in ('month', 'year')),
  constraint billing_checkout_status_valid check (status in ('created', 'completed', 'expired', 'failed')),
  constraint billing_checkout_idempotency_format check (idempotency_key ~ '^[A-Za-z0-9_.:-]{16,160}$'),
  constraint billing_checkout_metadata_object check (jsonb_typeof(metadata) = 'object'),
  unique (account_id, provider, idempotency_key)
);

create unique index if not exists billing_checkout_provider_session_uidx
  on public.billing_checkout_sessions (provider, provider_session_id)
  where provider_session_id is not null;

create index if not exists billing_checkout_account_created_idx
  on public.billing_checkout_sessions (account_id, created_at desc);

alter table public.billing_checkout_sessions enable row level security;

revoke all on table public.billing_checkout_sessions
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.billing_checkout_sessions
  to service_role;
grant select on table public.billing_checkout_sessions
  to authenticated;

create policy "Usuário pode consultar os próprios checkouts"
  on public.billing_checkout_sessions
  for select
  to authenticated
  using (auth.uid() = account_id);

create trigger billing_checkout_sessions_set_updated_at
before update on public.billing_checkout_sessions
for each row execute function public.set_billing_updated_at();

create or replace function public.apply_billing_provider_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_account_id uuid,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_billing_interval text default null,
  p_status text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_grace_period_ends_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_event_id uuid;
  v_effective_plan text;
  v_effective_interval text;
  v_period_start date;
begin
  if p_provider not in ('cakto', 'stripe') then
    raise exception 'billing_provider_invalid' using errcode = '22023';
  end if;

  if p_provider_event_id is null or length(trim(p_provider_event_id)) < 3 then
    raise exception 'billing_provider_event_id_invalid' using errcode = '22023';
  end if;

  if p_account_id is null or not exists (select 1 from auth.users where id = p_account_id) then
    raise exception 'billing_account_not_found' using errcode = '23503';
  end if;

  if p_billing_interval is not null and p_billing_interval not in ('month', 'year') then
    raise exception 'billing_interval_invalid' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'canceled') then
    raise exception 'billing_status_invalid' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'billing_metadata_invalid' using errcode = '22023';
  end if;

  perform public.initialize_billing_account(p_account_id);

  select subscription.id
    into v_subscription_id
  from public.subscriptions subscription
  where subscription.account_id = p_account_id
  for update;

  insert into public.billing_events (
    account_id,
    subscription_id,
    event_type,
    source,
    provider,
    provider_event_id,
    metadata
  ) values (
    p_account_id,
    v_subscription_id,
    p_event_type,
    'provider',
    p_provider,
    trim(p_provider_event_id),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider, provider_event_id)
    where provider is not null and provider_event_id is not null
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('applied', false, 'duplicate', true);
  end if;

  if p_status is not null then
    if p_status in ('active', 'trialing', 'past_due') and p_billing_interval in ('month', 'year') then
      v_effective_plan := 'pro';
      v_effective_interval := p_billing_interval;
    else
      v_effective_plan := 'free';
      v_effective_interval := 'free';
    end if;

    update public.subscriptions subscription
    set plan_code = v_effective_plan,
        billing_interval = case
          when v_effective_plan = 'pro' then v_effective_interval
          else 'free'
        end,
        status = case
          when v_effective_plan = 'pro' then p_status
          else case when p_status = 'canceled' then 'canceled' else 'free' end
        end,
        provider = case when v_effective_plan = 'pro' or p_status = 'canceled' then p_provider else null end,
        provider_customer_id = coalesce(p_provider_customer_id, subscription.provider_customer_id),
        provider_subscription_id = coalesce(p_provider_subscription_id, subscription.provider_subscription_id),
        current_period_start = coalesce(p_current_period_start, subscription.current_period_start),
        current_period_end = coalesce(p_current_period_end, subscription.current_period_end),
        grace_period_ends_at = case
          when p_status = 'past_due' then p_grace_period_ends_at
          else null
        end,
        canceled_at = case
          when p_status = 'canceled' then now()
          else null
        end,
        updated_at = now()
    where subscription.id = v_subscription_id;

    v_period_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;

    update public.account_usage usage
    set plan_code = v_effective_plan,
        billing_interval = case
          when v_effective_plan = 'pro' then v_effective_interval
          else 'free'
        end,
        version = usage.version + 1,
        updated_at = now()
    where usage.account_id = p_account_id
      and usage.period_start = v_period_start;
  end if;

  if p_event_type in ('checkout.session.completed', 'purchase_approved', 'subscription_created') then
    update public.billing_checkout_sessions checkout_session
    set status = 'completed',
        completed_at = coalesce(checkout_session.completed_at, now()),
        updated_at = now()
    where checkout_session.account_id = p_account_id
      and checkout_session.provider = p_provider
      and checkout_session.status = 'created';
  end if;

  return jsonb_build_object(
    'applied', true,
    'duplicate', false,
    'event_id', v_event_id,
    'subscription_id', v_subscription_id
  );
end;
$$;

revoke all on function public.apply_billing_provider_event(
  text, text, text, uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_billing_provider_event(
  text, text, text, uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz, jsonb
) to service_role;

comment on table public.billing_checkout_sessions is
  'Tentativas de checkout criadas no servidor, reutilizáveis por idempotência e visíveis somente pela própria conta.';

comment on function public.apply_billing_provider_event(
  text, text, text, uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz, jsonb
) is
  'Aplica um evento verificado de Cakto ou Stripe exatamente uma vez e sincroniza assinatura e cota efetiva.';

notify pgrst, 'reload schema';

commit;
