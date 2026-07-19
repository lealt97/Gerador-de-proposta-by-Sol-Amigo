import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROCEDURE_PATH = 'docs/MFA_LOST_PHONE_PROCEDURE.md';
const CHECKLIST_PATH = 'docs/PROJECT_COMPLETION_CHECKLIST.md';
const README_PATH = 'README.md';
const CHALLENGE_PATH = 'src/components/auth/MfaChallengeScreen.tsx';
const EDGE_FUNCTION_PATH = 'supabase/functions/mfa-recovery/index.ts';

test('procedimento define autoatendimento, reconfiguração e escalonamento seguro', async () => {
  const procedure = await readFile(PROCEDURE_PATH, 'utf8');

  assert.match(procedure, /Fluxo A — usuário possui um código de recuperação/);
  assert.match(procedure, /Perdi acesso ao aplicativo autenticador/);
  assert.match(procedure, /Usar código e remover MFA/);
  assert.match(procedure, /revogar globalmente as sessões/);
  assert.match(procedure, /exigir nova configuração do autenticador/);
  assert.match(procedure, /Fluxo C — usuário não possui código de recuperação/);
  assert.match(procedure, /não pode remover o MFA manualmente/);
  assert.match(procedure, /processo administrativo seguro de recuperação de conta/);
});

test('procedimento proíbe coleta de segredos e alterações manuais no Supabase', async () => {
  const procedure = await readFile(PROCEDURE_PATH, 'utf8');

  for (const safeguard of [
    'Nunca solicitar senha',
    'Nunca registrar códigos de recuperação em logs',
    'Nunca remover fatores diretamente em `auth.mfa_factors`',
    'Nunca expor `SUPABASE_SERVICE_ROLE_KEY`',
    'Não é permitido usar recuperação de senha como substituto do segundo fator',
  ]) {
    assert.ok(procedure.includes(safeguard), `procedimento deve conter: ${safeguard}`);
  }

  assert.doesNotMatch(procedure, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(procedure, /postgresql:\/\/[^.\s]+:[^.<\s]+@(?:db|aws-0)/);
});

test('procedimento cobre aparelho roubado, suporte e critérios de encerramento', async () => {
  const procedure = await readFile(PROCEDURE_PATH, 'utf8');

  assert.match(procedure, /Caso de aparelho roubado ou possivelmente desbloqueado/);
  assert.match(procedure, /bloquear ou apagar o aparelho remotamente/);
  assert.match(procedure, /Procedimento do suporte/);
  assert.match(procedure, /Informações proibidas/);
  assert.match(procedure, /Critérios de encerramento/);
  assert.match(procedure, /um novo fator TOTP foi verificado/);
  assert.match(procedure, /um novo conjunto de códigos foi gerado e salvo/);
});

test('implementação mantém o caminho de recuperação e a revogação global de sessões', async () => {
  const [challenge, edgeFunction] = await Promise.all([
    readFile(CHALLENGE_PATH, 'utf8'),
    readFile(EDGE_FUNCTION_PATH, 'utf8'),
  ]);

  assert.match(challenge, /Perdi acesso ao aplicativo autenticador/);
  assert.match(challenge, /recoverMfaWithCode/);
  assert.match(challenge, /Usar código e remover MFA/);
  assert.match(challenge, /mfa-recovery=success/);

  assert.match(edgeFunction, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(edgeFunction, /consume_mfa_recovery_code/);
  assert.match(edgeFunction, /admin\.auth\.admin\.signOut\(accessToken, 'global'\)/);
  assert.match(edgeFunction, /admin\.auth\.admin\.mfa\.deleteFactor/);
  assert.match(edgeFunction, /finalize_mfa_recovery/);
});

test('checklist e README registram o procedimento concluído', async () => {
  const [checklist, readme] = await Promise.all([
    readFile(CHECKLIST_PATH, 'utf8'),
    readFile(README_PATH, 'utf8'),
  ]);

  assert.match(checklist, /- \[x\] Criar procedimento para perda do celular/);
  assert.match(checklist, /Evidência do procedimento para perda do celular:/);
  assert.match(readme, /docs\/MFA_LOST_PHONE_PROCEDURE\.md/);
});
