export const SOLAR_MONTHS = [
  { key: 'jan', label: 'Jan', days: 31 },
  { key: 'feb', label: 'Fev', days: 28 },
  { key: 'mar', label: 'Mar', days: 31 },
  { key: 'apr', label: 'Abr', days: 30 },
  { key: 'may', label: 'Mai', days: 31 },
  { key: 'jun', label: 'Jun', days: 30 },
  { key: 'jul', label: 'Jul', days: 31 },
  { key: 'aug', label: 'Ago', days: 31 },
  { key: 'sep', label: 'Set', days: 30 },
  { key: 'oct', label: 'Out', days: 31 },
  { key: 'nov', label: 'Nov', days: 30 },
  { key: 'dec', label: 'Dez', days: 31 },
] as const;

export type SolarMonthKey = (typeof SOLAR_MONTHS)[number]['key'];

export type MonthlySolarInput = {
  month: SolarMonthKey;
  consumptionKwh: number;
  hsp: number;
};

export type ProfessionalSolarInput = {
  monthlyData: MonthlySolarInput[];
  minimumGridConsumptionKwh: number;
  generationAdditionalPercent: number;
  totalLossPercent: number;
  modulePowerW: number;
  moduleWidthM: number;
  moduleHeightM: number;
  spacingFactor: number;
  desiredDcAcRatio: number;
  availableAreaM2?: number | null;
  selectedInverterPowerKw?: number | null;
  energyTariff?: number | null;
};

export type MonthlySolarResult = {
  month: SolarMonthKey;
  label: string;
  days: number;
  consumptionKwh: number;
  compensableConsumptionKwh: number;
  targetGenerationKwh: number;
  hsp: number;
  generationKwh: number;
  compensatedEnergyKwh: number;
  surplusKwh: number;
  deficitKwh: number;
  openingCreditKwh: number;
  creditUsedKwh: number;
  closingCreditKwh: number;
  estimatedSavings: number;
};

export type SolarCalculationWarning = {
  code:
    | 'HIGH_LOSSES'
    | 'HIGH_ADDITIONAL_GENERATION'
    | 'INSUFFICIENT_AREA'
    | 'DESIRED_DC_AC_OUTSIDE_RANGE'
    | 'REAL_DC_AC_OUTSIDE_RANGE';
  severity: 'warning' | 'critical';
  message: string;
};

export type ProfessionalSolarResult = {
  yieldFactor: number;
  annualConsumptionKwh: number;
  annualCompensableConsumptionKwh: number;
  annualTargetGenerationKwh: number;
  annualSpecificYieldKwhPerKwp: number;
  requiredPowerKwp: number;
  moduleCount: number;
  installedPowerKwp: number;
  estimatedAnnualGenerationKwh: number;
  generationCoveragePercent: number;
  areaRequiredM2: number;
  recommendedInverterPowerKw: number;
  desiredDcAcRatio: number;
  realDcAcRatio: number | null;
  estimatedAnnualSavings: number;
  finalCreditBalanceKwh: number;
  monthly: MonthlySolarResult[];
  warnings: SolarCalculationWarning[];
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertFinite = (value: number, field: string) => {
  if (!Number.isFinite(value)) throw new Error(`${field} deve ser um número válido.`);
};

const assertNonNegative = (value: number, field: string) => {
  assertFinite(value, field);
  if (value < 0) throw new Error(`${field} não pode ser negativo.`);
};

function validateInput(input: ProfessionalSolarInput) {
  if (input.monthlyData.length !== SOLAR_MONTHS.length) {
    throw new Error('Informe consumo e HSP para os 12 meses do ano.');
  }

  const expectedMonths = new Set<SolarMonthKey>(SOLAR_MONTHS.map((month) => month.key));
  const receivedMonths = new Set<SolarMonthKey>();

  for (const item of input.monthlyData) {
    if (!expectedMonths.has(item.month) || receivedMonths.has(item.month)) {
      throw new Error('A série mensal contém meses ausentes ou duplicados.');
    }
    receivedMonths.add(item.month);
    assertNonNegative(item.consumptionKwh, `Consumo de ${item.month}`);
    assertNonNegative(item.hsp, `HSP de ${item.month}`);
    if (item.hsp === 0) throw new Error(`A HSP de ${item.month} deve ser maior que zero.`);
  }

  assertNonNegative(input.minimumGridConsumptionKwh, 'Consumo mínimo não compensável');
  assertNonNegative(input.generationAdditionalPercent, 'Geração adicional');
  assertNonNegative(input.totalLossPercent, 'Perdas totais');
  if (input.totalLossPercent >= 100) throw new Error('As perdas totais devem ser menores que 100%.');

  assertFinite(input.modulePowerW, 'Potência do módulo');
  if (input.modulePowerW <= 0) throw new Error('A potência do módulo deve ser maior que zero.');

  assertFinite(input.moduleWidthM, 'Largura do módulo');
  assertFinite(input.moduleHeightM, 'Altura do módulo');
  assertFinite(input.spacingFactor, 'Fator de espaçamento');
  if (input.moduleWidthM <= 0 || input.moduleHeightM <= 0) {
    throw new Error('As dimensões do módulo devem ser maiores que zero.');
  }
  if (input.spacingFactor < 1) throw new Error('O fator de espaçamento deve ser igual ou maior que 1.');

  assertFinite(input.desiredDcAcRatio, 'Relação DC/AC desejada');
  if (input.desiredDcAcRatio <= 0) throw new Error('A relação DC/AC desejada deve ser maior que zero.');

  if (input.availableAreaM2 != null) assertNonNegative(input.availableAreaM2, 'Área disponível');
  if (input.selectedInverterPowerKw != null) assertNonNegative(input.selectedInverterPowerKw, 'Potência do inversor');
  if (input.energyTariff != null) assertNonNegative(input.energyTariff, 'Tarifa de energia');
}

export function calculateProfessionalSolar(input: ProfessionalSolarInput): ProfessionalSolarResult {
  validateInput(input);

  const monthlyByKey = new Map(input.monthlyData.map((item) => [item.month, item]));
  const yieldFactor = 1 - input.totalLossPercent / 100;
  const generationMultiplier = 1 + input.generationAdditionalPercent / 100;
  const tariff = input.energyTariff || 0;

  let annualConsumptionKwh = 0;
  let annualCompensableConsumptionKwh = 0;
  let annualTargetGenerationKwh = 0;
  let annualSpecificYieldKwhPerKwp = 0;

  for (const month of SOLAR_MONTHS) {
    const item = monthlyByKey.get(month.key)!;
    const compensable = Math.max(item.consumptionKwh - input.minimumGridConsumptionKwh, 0);
    annualConsumptionKwh += item.consumptionKwh;
    annualCompensableConsumptionKwh += compensable;
    annualTargetGenerationKwh += compensable * generationMultiplier;
    annualSpecificYieldKwhPerKwp += item.hsp * month.days * yieldFactor;
  }

  if (annualCompensableConsumptionKwh <= 0) {
    throw new Error('O consumo compensável anual deve ser maior que zero.');
  }
  if (annualSpecificYieldKwhPerKwp <= 0) {
    throw new Error('O rendimento solar anual deve ser maior que zero.');
  }

  const requiredPowerKwp = annualTargetGenerationKwh / annualSpecificYieldKwhPerKwp;
  const moduleCount = Math.max(1, Math.ceil((requiredPowerKwp * 1000) / input.modulePowerW));
  const installedPowerKwp = (moduleCount * input.modulePowerW) / 1000;
  const areaRequiredM2 = moduleCount * input.moduleWidthM * input.moduleHeightM * input.spacingFactor;
  const recommendedInverterPowerKw = installedPowerKwp / input.desiredDcAcRatio;
  const selectedInverterPowerKw = input.selectedInverterPowerKw || 0;
  const realDcAcRatio = selectedInverterPowerKw > 0
    ? installedPowerKwp / selectedInverterPowerKw
    : null;

  let creditBalance = 0;
  let estimatedAnnualGenerationKwh = 0;
  let estimatedAnnualSavings = 0;

  const monthly: MonthlySolarResult[] = SOLAR_MONTHS.map((month) => {
    const item = monthlyByKey.get(month.key)!;
    const compensableConsumptionKwh = Math.max(
      item.consumptionKwh - input.minimumGridConsumptionKwh,
      0,
    );
    const targetGenerationKwh = compensableConsumptionKwh * generationMultiplier;
    const generationKwh = installedPowerKwp * item.hsp * month.days * yieldFactor;
    const openingCreditKwh = creditBalance;
    const directCompensationKwh = Math.min(generationKwh, compensableConsumptionKwh);
    const energyStillRequiredKwh = Math.max(compensableConsumptionKwh - generationKwh, 0);
    const creditUsedKwh = Math.min(openingCreditKwh, energyStillRequiredKwh);
    const compensatedEnergyKwh = directCompensationKwh + creditUsedKwh;
    const surplusKwh = Math.max(generationKwh - compensableConsumptionKwh, 0);
    const deficitKwh = Math.max(energyStillRequiredKwh - creditUsedKwh, 0);
    creditBalance = Math.max(openingCreditKwh + surplusKwh - creditUsedKwh, 0);
    const estimatedSavings = compensatedEnergyKwh * tariff;

    estimatedAnnualGenerationKwh += generationKwh;
    estimatedAnnualSavings += estimatedSavings;

    return {
      month: month.key,
      label: month.label,
      days: month.days,
      consumptionKwh: round(item.consumptionKwh),
      compensableConsumptionKwh: round(compensableConsumptionKwh),
      targetGenerationKwh: round(targetGenerationKwh),
      hsp: round(item.hsp, 3),
      generationKwh: round(generationKwh),
      compensatedEnergyKwh: round(compensatedEnergyKwh),
      surplusKwh: round(surplusKwh),
      deficitKwh: round(deficitKwh),
      openingCreditKwh: round(openingCreditKwh),
      creditUsedKwh: round(creditUsedKwh),
      closingCreditKwh: round(creditBalance),
      estimatedSavings: round(estimatedSavings),
    };
  });

  const generationCoveragePercent = annualCompensableConsumptionKwh > 0
    ? (estimatedAnnualGenerationKwh / annualCompensableConsumptionKwh) * 100
    : 0;

  const warnings: SolarCalculationWarning[] = [];
  if (input.totalLossPercent > 35) {
    warnings.push({
      code: 'HIGH_LOSSES',
      severity: 'warning',
      message: 'As perdas totais estão acima de 35%. Revise sombreamento, sujeira, temperatura e cabeamento.',
    });
  }
  if (input.generationAdditionalPercent >= 50) {
    warnings.push({
      code: 'HIGH_ADDITIONAL_GENERATION',
      severity: 'warning',
      message: 'A geração adicional é elevada. Confirme área disponível, uso futuro e aproveitamento dos créditos.',
    });
  }
  if (input.availableAreaM2 != null && areaRequiredM2 > input.availableAreaM2) {
    warnings.push({
      code: 'INSUFFICIENT_AREA',
      severity: 'critical',
      message: `A área necessária (${round(areaRequiredM2)} m²) excede a área disponível (${round(input.availableAreaM2)} m²).`,
    });
  }
  if (input.desiredDcAcRatio < 0.8 || input.desiredDcAcRatio > 1.3) {
    warnings.push({
      code: 'DESIRED_DC_AC_OUTSIDE_RANGE',
      severity: 'warning',
      message: 'A relação DC/AC desejada está fora da faixa de referência de 0,80 a 1,30.',
    });
  }
  if (realDcAcRatio != null && (realDcAcRatio < 0.8 || realDcAcRatio > 1.3)) {
    warnings.push({
      code: 'REAL_DC_AC_OUTSIDE_RANGE',
      severity: 'warning',
      message: `A relação DC/AC real ficou em ${round(realDcAcRatio, 3)}. Revise o inversor selecionado.`,
    });
  }

  return {
    yieldFactor: round(yieldFactor, 4),
    annualConsumptionKwh: round(annualConsumptionKwh),
    annualCompensableConsumptionKwh: round(annualCompensableConsumptionKwh),
    annualTargetGenerationKwh: round(annualTargetGenerationKwh),
    annualSpecificYieldKwhPerKwp: round(annualSpecificYieldKwhPerKwp),
    requiredPowerKwp: round(requiredPowerKwp, 3),
    moduleCount,
    installedPowerKwp: round(installedPowerKwp, 3),
    estimatedAnnualGenerationKwh: round(estimatedAnnualGenerationKwh),
    generationCoveragePercent: round(generationCoveragePercent),
    areaRequiredM2: round(areaRequiredM2),
    recommendedInverterPowerKw: round(recommendedInverterPowerKw, 3),
    desiredDcAcRatio: round(input.desiredDcAcRatio, 3),
    realDcAcRatio: realDcAcRatio == null ? null : round(realDcAcRatio, 3),
    estimatedAnnualSavings: round(estimatedAnnualSavings),
    finalCreditBalanceKwh: round(creditBalance),
    monthly,
    warnings,
  };
}
