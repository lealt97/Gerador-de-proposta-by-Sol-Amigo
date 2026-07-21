begin;

create or replace function public.get_my_onboarding_status()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with status as (
    select
      exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and nullif(trim(profile.company_name), '') is not null
          and (
            nullif(trim(coalesce(profile.company_email, '')), '') is not null
            or nullif(trim(coalesce(profile.phone, '')), '') is not null
          )
      ) as company_complete,
      exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid()
          and nullif(trim(coalesce(profile.logo_url, '')), '') is not null
      ) as logo_complete,
      exists (
        select 1 from public.solar_kits kit
        where kit.user_id = auth.uid()
      ) as kit_complete,
      exists (
        select 1 from public.clients client
        where client.user_id = auth.uid()
      ) as client_complete,
      exists (
        select 1 from public.proposals proposal
        where proposal.user_id = auth.uid()
      ) as proposal_complete
  )
  select jsonb_build_object(
    'company_complete', company_complete,
    'logo_complete', logo_complete,
    'kit_complete', kit_complete,
    'client_complete', client_complete,
    'proposal_complete', proposal_complete,
    'completed_steps',
      company_complete::integer
      + logo_complete::integer
      + kit_complete::integer
      + client_complete::integer
      + proposal_complete::integer,
    'total_steps', 5,
    'complete',
      company_complete
      and logo_complete
      and kit_complete
      and client_complete
      and proposal_complete
  )
  from status;
$$;

revoke all on function public.get_my_onboarding_status()
  from public, anon;
grant execute on function public.get_my_onboarding_status()
  to authenticated;

notify pgrst, 'reload schema';

commit;
