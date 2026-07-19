import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SETTINGS_PATH = 'src/pages/Configuracoes.tsx';
const MFA_SETTINGS_PATH = 'src/components/auth/MfaSettingsCard.tsx';
const MIGRATION_PATH = 'supabase/migrations/20260719235500_require_recent_password_confirmation.sql';
const SQL_TEST_PATH = 'supabase/tests/critical_password_confirmation.sql';
const WORKFLOW_PATH = '.github/workflows/migrations-homologation.yml';
const CHECKLIST_PATH = 'docs/PROJECT_COMPLETION_CHECKLIST.md';

test('alteração de senha exige a senha atual antes da atualização', async () => {
  const settings = await readFile(SETTINGS_PATH, 'utf8');
  const handlerStart = settings.indexOf('const handleUpdatePassword');
  const handlerEnd = settings.indexOf('const handleDeleteAccount');
  const handler = settings.slice(handlerStart, handlerEnd);

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.match(handler, /if \(!currentPassword\)/);
  assert.match(handler, /signInWithPassword\(\{ email: user\.email, password: currentPassword \}\)/);
  assert.match(handler, /updateUser\(\{ password: newPassword \}\)/);
  assert.ok(
    handler.indexOf('signInWithPassword') < handler.indexOf('updateUser'),
    'a senha atual deve ser validada antes de atualizar a senha',
  );
});

test('exclusão de conta exige frase e senha antes da RPC protegida', async () => {
  const settings = await readFile(SETTINGS_PATH, 'utf8');
  const handlerStart = settings.indexOf('const handleDeleteAccount');
  const handlerEnd = settings.indexOf('if (isLoading)');
  const handler = settings.slice(handlerStart, handlerEnd);

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.match(handler, /excluir a conta/);
  assert.match(handler, /if \(!deletePassword\)/);
  assert.match(handler, /signInWithPassword\(\{ email: user\.email, password: deletePassword \}\)/);
  assert.match(handler, /rpc\('delete_user_account'\)/);
  assert.ok(
    handler.indexOf('signInWithPassword') < handler.indexOf("rpc('delete_user_account')"),
    'a senha atual deve ser validada antes da exclusão',
  );
});

test('desativação do MFA exige senha atual e TOTP na ordem correta', async () => {
  const mfaSettings = await readFile(MFA_SETTINGS_PATH, 'utf8');
  const handlerStart = mfaSettings.indexOf('const disableMfa');
  const handlerEnd = mfaSettings.indexOf('const copySecret');
  const handler = mfaSettings.slice(handlerStart, handlerEnd);

  assert.match(mfaSettings, /const \[disablePassword, setDisablePassword\] = useState\(''\)/);
  assert.match(mfaSettings, /id="mfa-disable-password"/);
  assert.match(mfaSettings, /autoComplete="current-password"/);
  assert.match(handler, /if \(!disablePassword\)/);
  assert.match(handler, /supabase\.auth\.getUser\(\)/);
  assert.match(handler, /signInWithPassword/);
  assert.match(handler, /challengeAndVerifyFactor/);
  assert.match(handler, /mfa\.unenroll/);
  assert.ok(
    handler.indexOf('signInWithPassword') < handler.indexOf('challengeAndVerifyFactor'),
    'a senha deve ser confirmada antes do desafio TOTP',
  );
  assert.ok(
    handler.indexOf('challengeAndVerifyFactor') < handler.indexOf('mfa.unenroll'),
    'o TOTP deve ser confirmado antes de remover o fator',
  );
});

test('banco exige autenticação por senha recente para excluir a conta', async () => {
  const [migration, sqlTest, workflow] = await Promise.all([
    readFile(MIGRATION_PATH, 'utf8'),
    readFile(SQL_TEST_PATH, 'utf8'),
    readFile(WORKFLOW_PATH, 'utf8'),
  ]);

  assert.match(migration, /has_recent_password_confirmation/);
  assert.match(migration, /authentication_method ->> 'method' = 'password'/);
  assert.match(migration, /has_recent_password_confirmation\(300\)/);
  assert.match(migration, /raise exception 'password_confirmation_required'/);
  assert.match(migration, /revoke all on function public\.has_recent_password_confirmation/);

  assert.match(sqlTest, /uma confirmação de senha expirada foi aceita/);
  assert.match(sqlTest, /uma confirmação de senha recente foi rejeitada/);
  assert.match(sqlTest, /magic link foi tratado como confirmação da senha atual/);
  assert.match(workflow, /Testar confirmação de senha em operações críticas/);
  assert.match(workflow, /critical_password_confirmation\.sql/);
});

test('checklist registra a confirmação de senha como concluída', async () => {
  const checklist = await readFile(CHECKLIST_PATH, 'utf8');

  assert.match(checklist, /- \[x\] Exigir confirmação de senha para operações críticas/);
  assert.match(checklist, /Evidência da confirmação de senha em operações críticas:/);
});
