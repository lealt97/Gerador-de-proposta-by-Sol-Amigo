# Runbook de publicação — P2

## Pré-condições

- ambiente de homologação separado de produção;
- migrations P0 e P1 aplicadas;
- backup e procedimento de restauração validados;
- credenciais server-side do Supabase disponíveis somente para a equipe autorizada;
- minutas legais mantidas como `draft` até aprovação jurídica.

## 1. Banco de dados

Aplicar todas as migrations na ordem versionada e confirmar:

- `legal_document_versions` com três versões ativas em estado `draft`;
- `account_legal_acceptances` com RLS;
- `platform_admins` sem privilégios para `anon` ou `authenticated`;
- `admin_audit_logs` append-only;
- `beta_feedback` isolado por conta;
- RPCs de aceite e onboarding disponíveis somente para usuários autenticados;
- `delete_user_account()` indisponível para o frontend comum.

Executar a auditoria e os testes:

```bash
npx supabase db reset --local
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_audit.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/p2_lgpd_admin_onboarding.sql
```

## 2. Edge Functions

Publicar no mesmo projeto Supabase do ambiente:

```bash
supabase functions deploy account-data-export
supabase functions deploy account-delete
supabase functions deploy admin-console
```

As três funções exigem JWT. Não usar `--no-verify-jwt`.

Variáveis já esperadas no ambiente protegido:

- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

Nenhuma dessas credenciais pode ser copiada para variáveis `VITE_*`, Railway frontend, repositório, navegador ou ferramenta de analytics.

## 3. Primeiro administrador

O sistema não cria administrador automaticamente. Após confirmar o UUID da pessoa responsável e sua autenticação em AAL2, executar pelo SQL Editor protegido:

```sql
insert into public.platform_admins (
  user_id,
  role,
  active,
  created_by
) values (
  '<UUID_CONFIRMADO>',
  'super_admin',
  true,
  '<UUID_CONFIRMADO>'
)
on conflict (user_id) do update
set role = excluded.role,
    active = true,
    updated_at = now();

insert into public.admin_audit_logs (
  actor_id,
  actor_role,
  action,
  target_account_id,
  reason,
  metadata
) values (
  '<UUID_CONFIRMADO>',
  'super_admin',
  'admin.bootstrap.created',
  '<UUID_CONFIRMADO>',
  'Criação controlada do primeiro administrador do ambiente.',
  jsonb_build_object('environment', '<HOMOLOGACAO_OU_PRODUCAO>')
);
```

Confirmar que um usuário não cadastrado em `platform_admins` recebe HTTP 403 ao invocar `admin-console`.

## 4. Teste de exportação

Com uma conta de homologação contendo cliente, kit, proposta, PDF e feedback:

1. abrir “Privacidade e Dados”;
2. gerar a exportação;
3. validar o schema `solamigo-account-export-v1`;
4. confirmar que os registros pertencem somente à conta autenticada;
5. abrir os links temporários dos arquivos privados;
6. aguardar a expiração e confirmar que os links deixam de funcionar;
7. procurar por senha, TOTP, recovery code, token, cookie, `service_role`, chave Stripe/Cakto e dados de cartão;
8. reprovar a publicação se qualquer segredo aparecer.

## 5. Teste de exclusão

Usar somente uma conta descartável:

1. criar arquivos nos buckets `logos`, `pdf-assets` e `proposals`;
2. confirmar a senha novamente;
3. digitar a frase exigida;
4. executar a exclusão;
5. confirmar que as pastas da conta não possuem objetos;
6. confirmar que o usuário não existe na Auth;
7. confirmar que dados vinculados foram removidos por cascade;
8. confirmar que trilhas de segurança preservadas estão sem vínculo identificável;
9. tentar reutilizar a sessão antiga e confirmar rejeição.

## 6. Teste administrativo

- papel `support`: visualizar contas, falhas e feedback; bloquear mutações;
- papel `operations`: bloquear e reativar com justificativa;
- papel `super_admin`: mesmas capacidades operacionais e responsabilidade de bootstrap;
- tentar autobloqueio e confirmar rejeição;
- confirmar que cada visualização detalhada e alteração gera auditoria;
- confirmar que auditorias não podem ser editadas ou excluídas.

## 7. Documentos legais

Antes do beta, é permitido usar somente as minutas claramente identificadas como draft. Antes do lançamento comercial aberto, substituir por versões aprovadas e registrar:

- responsável pela aprovação;
- data de vigência;
- CNPJ, razão social e contatos oficiais;
- controlador, operador e encarregado;
- bases legais e finalidades;
- fornecedores e transferências;
- retenção;
- canal do titular;
- regras de cancelamento, arrependimento e reembolso.

Nunca alterar silenciosamente o conteúdo de uma versão já aceita. Criar uma nova versão e exigir novo aceite quando a mudança for material.

## 8. Critério de rollback

Interromper e reverter a publicação quando ocorrer qualquer um destes eventos:

- migrations não aplicam do zero;
- RLS ou teste P2 falha;
- exportação mistura contas;
- segredo aparece no pacote exportado;
- exclusão deixa arquivos órfãos;
- usuário comum acessa o painel administrativo;
- administrador altera conta sem auditoria;
- documento draft aparece como juridicamente aprovado.
