import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR_VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('a etapa de geração adicional exibe somente o input digitável', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(calculator, /label="Geração adicional desejada"/);
  assert.match(
    calculator,
    /O percentual é aplicado sobre o consumo compensável\. Use 0% quando o cliente não solicitar geração adicional\./,
  );
  assert.doesNotMatch(calculator, /\[0, 10, 20, 30\]/);
  assert.doesNotMatch(calculator, /setGenerationIncreasePercent\(String\(percentage\)\)/);
});
