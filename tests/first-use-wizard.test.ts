import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

const APP = 'src/App.tsx';
const GATE = 'src/components/auth/FirstUseGate.tsx';
const WIZARD = 'src/pages/Onboarding.tsx';
const SERVICE = 'src/services/firstUseService.ts';


test('rotas privadas exigem a conclusão do primeiro uso', async () => {
  const [app, gate] = await Promise.all([read(APP), read(GATE)]);

  assert.match(app, /<Route element={<FirstUseGate \/>}>/);
  assert.match(app, /path="primeiros-passos" element={<Onboarding \/>}/);
  assert.match(gate, /firstUseService\.requiresFirstUse\(user\)/);
  assert.match(gate, /<Navigate to="\/primeiros-passos"/);
  assert.match(gate, /location\.pathname === '\/primeiros-passos'/);
});


test('wizard salva dados nas áreas reais da conta sem estado paralelo', async () => {
  const wizard = await read(WIZARD);

  assert.match(wizard, /profileService\.updateProfile\(user\.id/);
  assert.match(wizard, /company_name:/);
  assert.match(wizard, /seller_name:/);
  assert.match(wizard, /profileService\.uploadLogo/);
  assert.match(wizard, /serializeLogos/);
  assert.match(wizard, /legalService\.acceptCurrentDocuments\(\)/);
  assert.doesNotMatch(wizard, /insert\(['"]onboarding/);
  assert.doesNotMatch(wizard, /localStorage/);
});


test('conclusão usa metadados de autenticação e preserva contas legadas', async () => {
  const service = await read(SERVICE);

  assert.match(service, /FIRST_USE_RELEASE_AT/);
  assert.match(service, /first_use_completed_at/);
  assert.match(service, /first_use_version/);
  assert.match(service, /first_use_logo_skipped/);
  assert.match(service, /createdAt >= releaseAt/);
  assert.match(service, /status\.complete/);
});


test('wizard contém as etapas essenciais e libera o dashboard somente no final', async () => {
  const wizard = await read(WIZARD);

  assert.match(wizard, /Boas-vindas/);
  assert.match(wizard, /Empresa/);
  assert.match(wizard, /Responsável/);
  assert.match(wizard, /Identidade visual/);
  assert.match(wizard, /Segurança e termos/);
  assert.match(wizard, /Entrar na plataforma/);
  assert.match(wizard, /firstUseService\.complete\(finalStatus\)/);
  assert.match(wizard, /window\.location\.assign\('\/dashboard'\)/);
});
