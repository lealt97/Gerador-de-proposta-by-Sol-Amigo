-- =========================================================
-- Preparação idempotente da migration-base
--
-- Em instalações antigas, as tabelas e políticas abaixo podem ter sido
-- criadas manualmente antes do versionamento. Removemos somente políticas
-- que serão recriadas imediatamente pelas migrations seguintes.
-- Em um banco vazio, este arquivo não realiza alterações.
-- =========================================================

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "Usuário pode visualizar apenas o próprio profile" on public.profiles';
    execute 'drop policy if exists "Usuário pode inserir apenas o próprio profile" on public.profiles';
    execute 'drop policy if exists "Usuário pode atualizar apenas o próprio profile" on public.profiles';
  end if;

  if to_regclass('public.clients') is not null then
    execute 'drop policy if exists "Usuário pode ver apenas seus clientes" on public.clients';
    execute 'drop policy if exists "Usuário pode criar clientes para si mesmo" on public.clients';
    execute 'drop policy if exists "Usuário pode editar apenas seus clientes" on public.clients';
    execute 'drop policy if exists "Usuário pode excluir apenas seus clientes" on public.clients';
  end if;

  if to_regclass('public.proposals') is not null then
    execute 'drop policy if exists "Usuário pode ver apenas suas propostas" on public.proposals';
    execute 'drop policy if exists "Usuário pode criar propostas para seus clientes" on public.proposals';
    execute 'drop policy if exists "Usuário pode editar apenas suas propostas" on public.proposals';
    execute 'drop policy if exists "Usuário pode excluir apenas suas propostas" on public.proposals';
  end if;

  if to_regclass('public.proposal_loads') is not null then
    execute 'drop policy if exists "Usuário pode ver apenas as cargas das próprias propostas" on public.proposal_loads';
    execute 'drop policy if exists "Usuário pode criar cargas para as próprias propostas" on public.proposal_loads';
    execute 'drop policy if exists "Usuário pode editar cargas das próprias propostas" on public.proposal_loads';
    execute 'drop policy if exists "Usuário pode excluir cargas das próprias propostas" on public.proposal_loads';
  end if;

  if to_regclass('public.solar_system_calculations') is not null then
    execute 'drop policy if exists "Usuário só pode ver cálculos das próprias propostas" on public.solar_system_calculations';
    execute 'drop policy if exists "Usuário só pode criar cálculos para as próprias propostas" on public.solar_system_calculations';
    execute 'drop policy if exists "Usuário só pode atualizar cálculos das próprias propostas" on public.solar_system_calculations';
    execute 'drop policy if exists "Usuário só pode deletar cálculos das próprias propostas" on public.solar_system_calculations';
  end if;

  if to_regclass('public.proposal_events') is not null then
    execute 'drop policy if exists "Usuario pode ler eventos das proprias propostas" on public.proposal_events';
    execute 'drop policy if exists "Usuario pode inserir eventos nas proprias propostas" on public.proposal_events';
  end if;

  if to_regclass('public.pdf_cover_templates') is not null then
    execute 'drop policy if exists "Templates de capa sao visiveis para todos os usuarios autentica" on public.pdf_cover_templates';
  end if;

  if to_regclass('public.pdf_templates') is not null then
    execute 'drop policy if exists "Usuarios podem ver seus proprios templates de pdf" on public.pdf_templates';
    execute 'drop policy if exists "Usuarios podem inserir seus proprios templates de pdf" on public.pdf_templates';
    execute 'drop policy if exists "Usuarios podem atualizar seus proprios templates de pdf" on public.pdf_templates';
    execute 'drop policy if exists "Usuarios podem deletar seus proprios templates de pdf" on public.pdf_templates';
  end if;

  if to_regclass('public.pdf_template_presets') is not null then
    execute 'drop policy if exists "Presets are viewable by all users" on public.pdf_template_presets';
  end if;

  if to_regclass('public.pdf_user_models') is not null then
    execute 'drop policy if exists "Users can view their own models" on public.pdf_user_models';
    execute 'drop policy if exists "Users can insert their own models" on public.pdf_user_models';
    execute 'drop policy if exists "Users can update their own models" on public.pdf_user_models';
    execute 'drop policy if exists "Users can delete their own models" on public.pdf_user_models';
  end if;
end
$$;
