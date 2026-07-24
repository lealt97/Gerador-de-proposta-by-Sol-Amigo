import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const COMPONENT = 'src/pages/propostas/RoofPhotoUpload.tsx';
const STORAGE_SERVICE = 'src/services/storageAssetService.ts';

test('permite selecionar, fotografar, visualizar, trocar e remover a foto do telhado', async () => {
  const component = await readFile(COMPONENT, 'utf8');

  assert.match(component, /type="file"/);
  assert.match(component, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(component, /capture="environment"/);
  assert.match(component, /uploadRoofImage/);
  assert.match(component, /resolveAssetUrl/);
  assert.match(component, /alt="Foto do telhado do cliente"/);
  assert.match(component, /Trocar foto/);
  assert.match(component, /Remover foto/);
  assert.match(component, /máximo de 8 MB/);
});

test('mantém a referência da foto ao navegar entre as abas', async () => {
  const component = await readFile(COMPONENT, 'utf8');

  assert.match(component, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(component, /sessionStorage\.setItem\(storageKey, newReference\)/);
  assert.match(component, /sessionStorage\.removeItem\(storageKey\)/);
  assert.match(component, /sol-amigo:roof-photo:/);
});

test('armazena e remove a foto em caminho privado do próprio usuário', async () => {
  const service = await readFile(STORAGE_SERVICE, 'utf8');

  assert.match(service, /uploadRoofImage/);
  assert.match(service, /uploadImage\(file, 'proposals', userId, 'roof-photos'\)/);
  assert.match(service, /removeRoofImage/);
  assert.match(service, /const allowedPrefix = `\$\{userId\}\/roof-photos\/`/);
  assert.match(service, /reference\.bucket !== 'proposals'/);
  assert.match(service, /supabase\.storage\.from\('proposals'\)\.remove/);
});
