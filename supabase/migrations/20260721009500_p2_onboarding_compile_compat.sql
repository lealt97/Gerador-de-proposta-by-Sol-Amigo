-- Compatibilidade temporária para instalações cujo baseline de profiles
-- não possui a coluna email. A função é corrigida e a coluna removida nas
-- migrations imediatamente seguintes.
begin;

alter table public.profiles
  add column if not exists email text;

commit;
