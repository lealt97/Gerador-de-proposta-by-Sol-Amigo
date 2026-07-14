-- =========================================================
-- Catálogo de Kits Solares
-- =========================================================

create table if not exists public.solar_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  supplier text,
  module_brand text,
  module_model text,
  module_power_w numeric not null default 0 check (module_power_w >= 0),
  module_quantity integer not null default 0 check (module_quantity >= 0),
  inverter_brand text,
  inverter_model text,
  inverter_power_kw numeric check (inverter_power_kw is null or inverter_power_kw >= 0),
  structure_type text,
  kit_power_kwp numeric generated always as ((module_power_w * module_quantity) / 1000.0) stored,
  cost_price numeric not null default 0 check (cost_price >= 0),
  sale_price numeric check (sale_price is null or sale_price >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solar_kits_user_id_idx on public.solar_kits(user_id);
create index if not exists solar_kits_active_power_idx on public.solar_kits(user_id, active, kit_power_kwp);

alter table public.solar_kits enable row level security;

-- Usuários autenticados só enxergam seus próprios kits.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solar_kits'
      and policyname = 'Users can view own solar kits'
  ) then
    create policy "Users can view own solar kits"
    on public.solar_kits
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solar_kits'
      and policyname = 'Users can create own solar kits'
  ) then
    create policy "Users can create own solar kits"
    on public.solar_kits
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solar_kits'
      and policyname = 'Users can update own solar kits'
  ) then
    create policy "Users can update own solar kits"
    on public.solar_kits
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solar_kits'
      and policyname = 'Users can delete own solar kits'
  ) then
    create policy "Users can delete own solar kits"
    on public.solar_kits
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- Atualização automática de updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_solar_kits_updated_at on public.solar_kits;
create trigger set_solar_kits_updated_at
before update on public.solar_kits
for each row
execute function public.set_updated_at();

-- Campos preparados para salvar o kit escolhido em cada proposta.
alter table public.proposals
  add column if not exists selected_solar_kit_id uuid references public.solar_kits(id) on delete set null,
  add column if not exists solar_kit_snapshot jsonb;

create index if not exists proposals_selected_solar_kit_id_idx on public.proposals(selected_solar_kit_id);
