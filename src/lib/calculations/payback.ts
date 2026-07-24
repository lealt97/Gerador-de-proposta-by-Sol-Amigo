export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';

export type PaybackAdditionalCost = {
  description: string;
  amount: number;
};

export type PaybackInput = {
  kitCost: number;
  marginPercentage: number;
  tariffCentsPerKwh: number;
  pisPercent: number;
  cofinsPercent: number;
  icmsPercent: number;
  otherTariffsPercent: number;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  additionalCosts: PaybackAdditionalCost[];
  projectionYears?: number;
};

export type PaybackChartPoint = {
  year: number;
  cumulativeBalance: number;
};

export type PaybackResult = {
  kitCost: number;
  additionalCostsTotal: number;
  directCost: number;
  marginPercentage: number;
  profitAmount: number;
  totalInvestment: number;
  totalTariffsPercent: number;
  effectiveTariffPerKwh: number;
  compensatedEnergyKwhPerMonth: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  paybackMonths: number;
  status: PaybackStatus;
  statusLabel: string;
  chartData: PaybackChartPoint[];
};

export const PAYBACK_STATUS_LABELS: Record<PaybackStatus, string> = {
  excellent: 'Excelente',
  very_good: 'Muito bom',
  good: 'Bom',
  regular: 'Regular',
  unfeasible: 'Inviável',
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} deve ser igual ou maior que zero.`);
  }
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

export function classifyPayback(paybackYears: number): PaybackStatus {
  if (!Number.isFinite(paybackYears) || paybackYears > 10) return 'unfeasible';
  if (paybackYears <= 3) return 'excellent';
  if (paybackYears <= 5) return 'very_good';
  if (paybackYears <= 7) return 'good';
  return 'regular';
}

export function calculatePayback(input: PaybackInput): PaybackResult {
  assertPositive(input.kitCost, 'Preço do kit');
  assertNonNegative(input.marginPercentage, 'Margem de lucro');
  if (input.marginPercentage >= 100) {
    throw new Error('Margem de lucro deve ser menor que 100%.');
  }

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');
  assertNonNegative(input.pisPercent, 'PIS');
  assertNonNegative(input.cofinsPercent, 'COFINS');
  assertNonNegative(input.icmsPercent, 'ICMS');
  assertNonNegative(input.otherTariffsPercent, 'Outros encargos');
  assertPositive(input.monthlyCompensableConsumptionKwh, 'Consumo compensável');
  assertPositive(input.monthlyGenerationKwh, 'Geração mensal');

  const additionalCostsTotal = input.additionalCosts.reduce((total, cost) => {
    assertNonNegative(cost.amount, cost.description || 'Custo adicional');
    return total + cost.amount;
  }, 0);

  const directCost = input.kitCost + additionalCostsTotal;
  const marginFraction = input.marginPercentage / 100;
  const totalInvestment = directCost / (1 - marginFraction);
  const profitAmount = totalInvestment - directCost;

  const totalTariffsPercent = input.pisPercent
    + input.cofinsPercent
    + input.icmsPercent
    + input.otherTariffsPercent;
  const effectiveTariffPerKwh = (input.tariffCentsPerKwh / 100) * (1 + totalTariffsPercent / 100);
  const compensatedEnergyKwhPerMonth = Math.min(
    input.monthlyCompensableConsumptionKwh,
    input.monthlyGenerationKwh,
  );
  const monthlySavings = compensatedEnergyKwhPerMonth * effectiveTariffPerKwh;
  const annualSavings = monthlySavings * 12;
  const paybackYears = annualSavings > 0 ? totalInvestment / annualSavings : Number.POSITIVE_INFINITY;
  const status = classifyPayback(paybackYears);
  const projectionYears = Math.min(40, Math.max(1, Math.trunc(input.projectionYears ?? 25)));
  const chartData = Array.from({ length: projectionYears + 1 }, (_, year) => ({
    year,
    cumulativeBalance: round((annualSavings * year) - totalInvestment),
  }));

  return {
    kitCost: round(input.kitCost),
    additionalCostsTotal: round(additionalCostsTotal),
    directCost: round(directCost),
    marginPercentage: round(input.marginPercentage),
    profitAmount: round(profitAmount),
    totalInvestment: round(totalInvestment),
    totalTariffsPercent: round(totalTariffsPercent),
    effectiveTariffPerKwh: round(effectiveTariffPerKwh, 4),
    compensatedEnergyKwhPerMonth: round(compensatedEnergyKwhPerMonth),
    monthlySavings: round(monthlySavings),
    annualSavings: round(annualSavings),
    paybackYears: round(paybackYears, 2),
    paybackMonths: Number.isFinite(paybackYears) ? Math.ceil(paybackYears * 12) : Number.POSITIVE_INFINITY,
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    chartData,
  };
}
