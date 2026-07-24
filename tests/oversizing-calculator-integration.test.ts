import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('calculadora apresenta oversizing após a seleção do kit', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /calculateDcAcOversizing/);
  assert.match(source, /selectedKitOversizing/);
  assert.match(source, /Relação DC\/AC/);
  assert.match(source, /Oversizing/);
  assert.match(source, /Potência AC do inversor/);
  assert.match(source, /datasheet do inversor/);
});
