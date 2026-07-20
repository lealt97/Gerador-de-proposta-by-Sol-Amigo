-- =========================================================
-- Provedores de pagamento suportados
-- - Cakto para Brasil/BRL e funis comerciais
-- - Stripe para expansão internacional
-- - uma assinatura possui no máximo um provedor responsável
-- =========================================================

begin;

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_valid;

alter table public.subscriptions
  add constraint subscriptions_provider_valid
  check (provider is null or provider in ('cakto', 'stripe'))
  not valid;

alter table public.subscriptions
  validate constraint subscriptions_provider_valid;

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_state_consistent;

alter table public.subscriptions
  add constraint subscriptions_provider_state_consistent
  check (
    (
      plan_code = 'free'
      and provider is null
      and provider_customer_id is null
      and provider_subscription_id is null
    )
    or
    (
      plan_code <> 'free'
      and provider in ('cakto', 'stripe')
    )
  )
  not valid;

alter table public.subscriptions
  validate constraint subscriptions_provider_state_consistent;

alter table public.billing_events
  drop constraint if exists billing_events_provider_valid;

alter table public.billing_events
  add constraint billing_events_provider_valid
  check (provider is null or provider in ('cakto', 'stripe'))
  not valid;

alter table public.billing_events
  validate constraint billing_events_provider_valid;

comment on column public.subscriptions.provider is
  'Provedor único responsável pela assinatura paga: cakto ou stripe. Contas gratuitas não possuem provedor.';

comment on column public.billing_events.provider is
  'Provedor externo que originou o evento, limitado a cakto ou stripe quando preenchido.';

notify pgrst, 'reload schema';

commit;
