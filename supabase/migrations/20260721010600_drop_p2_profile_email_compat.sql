begin;

alter table public.profiles
  drop column if exists email;

commit;
