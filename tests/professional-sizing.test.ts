import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateProfessionalSizing,
  CONNECTION_AVAILABILITY_KWH,
  type ProfessionalSizingInput,
} from '../src/lib/calculations/professionalSizing';

const createInput = (overrides: Partial<ProfessionalSizingInput> = {}): ProfessionalSizingInput => ({
  monthlyConsumptionKwh: Array.from({ length: 12 }, () => 600),
  connectionType: 'biphase',
  hspDaily: 5.2,
  performanceRatioPercent: 80,
  generationIncreasePercent: 0,
  selectedKitPowerKwp: 4.95,
  ...overrides,
});

test('custos de disponibilidade seguem o tipo de ligação', () => {
  assert.equal(CONNECTION_AVAILABILITY_KWH.monophase, 30);
  assert.equal(CONNECTION_AVAILABILITY_KWH.biphase, 50);
  assert.equal(CONNECTION_AVAILABILITY_KWH.triphase, 100);
});

test('calcula média, consumo compensável e potência necessária', () => {
  const result = calculateProfessionalSizing(createInput({ selectedKitPowerKwp: null }));

  assert.equal(result.annualConsumptionKwh, 7200);
  assert.equal(result.averageMonthlyConsumptionKwh, 600);
  assert.equal(result.availabilityConsumptionKwh, 50);
  assert.equal(result.compensableMonthlyConsumptionKwh, 550);
  assert.equal(result.compensableDailyConsumptionKwh, 18.333);
  assert.equal(result.generationIncreasePercent, 0);
  assert.equal(result.targetMonthlyGenerationKwh, 550);
  assert.equal(result.performanceRatio, 0.8);
  assert.equal(result.requiredPowerKwp, 4.407);
});

test('aplica geração adicional sobre o consumo compensável', () => {
  const result = calculateProfessionalSizing(createInput({
    generationIncreasePercent: 10,
    selectedKitPowerKwp: 4.95,
  }));

  assert.equal(result.compensableMonthlyConsumptionKwh, 550);
  assert.equal(result.generationIncreasePercent, 10);
  assert.equal(result.targetMonthlyGenerationKwh, 605);
  assert.equal(result.targetDailyGenerationKwh, 20.16);
  assert.equal(result.requiredPowerKwp, 4.848);
  assert.equal(result.selectedKitEstimatedMonthlyGenerationKwh, 617.76);
  assert.equal(result.selectedKitCoveragePercent, 102.11);
  assert.equal(result.selectedKitEnergyBalanceKwh, 12.76);
  assert.equal(result.selectedKitIsAdequate, true);
});

test('gera 10% a mais no exemplo de consumo compensável de 608,75 kWh', () => {
  const result = calculateProfessionalSizing(createInput({
    monthlyConsumptionKwh: Array.from({ length: 12 }, () => 658.75),
    generationIncreasePercent: 10,
    selectedKitPowerKwp: null,
  }));

  assert.equal(result.compensableMonthlyConsumptionKwh, 608.75);
  assert.equal(result.targetMonthlyGenerationKwh, 669.63);
  assert.equal(result.requiredPowerKwp, 5.366);
});

test('exibe 20,26 kWh por dia para consumo médio de 658 kWh em ligação bifásica', () => {
  const result = calculateProfessionalSizing(createInput({
    monthlyConsumptionKwh: Array.from({ length: 12 }, () => 658),
    connectionType: 'biphase',
    hspDaily: 5.56,
    performanceRatioPercent: 80,
    generationIncreasePercent: 0,
    selectedKitPowerKwp: null,
  }));

  assert.equal(result.compensableMonthlyConsumptionKwh, 608);
  assert.equal(result.targetDailyGenerationKwh, 20.26);
  assert.equal(result.requiredPowerKwp, 4.556);
});

test('kit cadastrado é comparado com a potência calculada sem redimensionar seus equipamentos', () => {
  const result = calculateProfessionalSizing(createInput());

  assert.equal(result.selectedKitPowerKwp, 4.95);
  assert.equal(result.selectedKitEstimatedMonthlyGenerationKwh, 617.76);
  assert.equal(result.selectedKitCoveragePercent, 112.32);
  assert.equal(result.selectedKitEnergyBalanceKwh, 67.76);
  assert.equal(result.selectedKitIsAdequate, true);
});

test('identifica kit abaixo da meta de geração', () => {
  const result = calculateProfessionalSizing(createInput({
    generationIncreasePercent: 20,
    selectedKitPowerKwp: 4.95,
  }));

  assert.equal(result.targetMonthlyGenerationKwh, 660);
  assert.equal(result.requiredPowerKwp, 5.288);
  assert.equal(result.selectedKitIsAdequate, false);
  assert.ok((result.selectedKitEnergyBalanceKwh ?? 0) < 0);
});

test('rejeita série incompleta, HSP inválida, rendimento e geração adicional inválidos', () => {
  assert.throws(
    () => calculateProfessionalSizing(createInput({ monthlyConsumptionKwh: [600, 600] })),
    /12 meses/,
  );
  assert.throws(
    () => calculateProfessionalSizing(createInput({ hspDaily: 0 })),
    /HSP diária/,
  );
  assert.throws(
    () => calculateProfessionalSizing(createInput({ performanceRatioPercent: 101 })),
    /menor ou igual a 100%/,
  );
  assert.throws(
    () => calculateProfessionalSizing(createInput({ generationIncreasePercent: 101 })),
    /entre 0% e 100%/,
  );
});
