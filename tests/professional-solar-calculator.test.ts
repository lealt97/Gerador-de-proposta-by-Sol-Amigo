import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateProfessionalSolar,
  SOLAR_MONTHS,
  type ProfessionalSolarInput,
} from '../src/lib/calculations/professionalSolar';

const createInput = (overrides: Partial<ProfessionalSolarInput> = {}): ProfessionalSolarInput => ({
  monthlyData: SOLAR_MONTHS.map((month) => ({
    month: month.key,
    consumptionKwh: 500,
    hsp: 5,
  })),
  minimumGridConsumptionKwh: 30,
  generationAdditionalPercent: 0,
  totalLossPercent: 20,
  modulePowerW: 550,
  moduleWidthM: 2,
  moduleHeightM: 1,
  spacingFactor: 1.1,
  desiredDcAcRatio: 1.2,
  availableAreaM2: 30,
  selectedInverterPowerKw: 4,
  energyTariff: 1,
  ...overrides,
});

test('perdas informadas diretamente viram fator de rendimento sem dupla aplicação', () => {
  const result = calculateProfessionalSolar(createInput());

  assert.equal(result.yieldFactor, 0.8);
  assert.equal(result.annualCompensableConsumptionKwh, 5640);
  assert.equal(result.annualSpecificYieldKwhPerKwp, 1460);
  assert.equal(result.moduleCount, 8);
  assert.equal(result.installedPowerKwp, 4.4);
  assert.equal(result.areaRequiredM2, 17.6);
  assert.equal(result.monthly.length, 12);
});

test('geração adicional de 10, 20, 30 ou 50 por cento aumenta a meta proporcionalmente', () => {
  const base = calculateProfessionalSolar(createInput());
  const ten = calculateProfessionalSolar(createInput({ generationAdditionalPercent: 10 }));
  const twenty = calculateProfessionalSolar(createInput({ generationAdditionalPercent: 20 }));
  const thirty = calculateProfessionalSolar(createInput({ generationAdditionalPercent: 30 }));
  const fifty = calculateProfessionalSolar(createInput({ generationAdditionalPercent: 50 }));

  assert.equal(ten.annualTargetGenerationKwh, base.annualCompensableConsumptionKwh * 1.1);
  assert.equal(twenty.annualTargetGenerationKwh, base.annualCompensableConsumptionKwh * 1.2);
  assert.equal(thirty.annualTargetGenerationKwh, base.annualCompensableConsumptionKwh * 1.3);
  assert.equal(fifty.annualTargetGenerationKwh, base.annualCompensableConsumptionKwh * 1.5);
  assert.ok(fifty.moduleCount > base.moduleCount);
  assert.ok(fifty.warnings.some((warning) => warning.code === 'HIGH_ADDITIONAL_GENERATION'));
});

test('oversizing calcula potência sugerida e relação DC/AC real separadamente', () => {
  const result = calculateProfessionalSolar(createInput({
    desiredDcAcRatio: 1.2,
    selectedInverterPowerKw: 4,
  }));

  assert.equal(result.recommendedInverterPowerKw, 3.667);
  assert.equal(result.realDcAcRatio, 1.1);
  assert.equal(result.desiredDcAcRatio, 1.2);
});

test('motor produz balanço mensal, créditos, economia e alertas de área', () => {
  const result = calculateProfessionalSolar(createInput({
    availableAreaM2: 10,
    energyTariff: 0.95,
  }));

  assert.ok(result.estimatedAnnualGenerationKwh > 0);
  assert.ok(result.estimatedAnnualSavings > 0);
  assert.ok(result.finalCreditBalanceKwh >= 0);
  assert.ok(result.monthly.every((month) => month.generationKwh > 0));
  assert.ok(result.warnings.some((warning) => warning.code === 'INSUFFICIENT_AREA'));
});

test('motor rejeita série incompleta, HSP zero e perdas iguais ou acima de 100 por cento', () => {
  assert.throws(
    () => calculateProfessionalSolar(createInput({ monthlyData: createInput().monthlyData.slice(0, 11) })),
    /12 meses/,
  );
  assert.throws(
    () => calculateProfessionalSolar(createInput({
      monthlyData: createInput().monthlyData.map((month, index) => index === 0 ? { ...month, hsp: 0 } : month),
    })),
    /HSP/,
  );
  assert.throws(
    () => calculateProfessionalSolar(createInput({ totalLossPercent: 100 })),
    /menores que 100%/,
  );
});
