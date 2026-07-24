export type DcAcOversizingStatus = 'dc_below_ac' | 'reference' | 'above_reference';

export type DcAcOversizingResult = {
  dcPowerKwp: number;
  acPowerKw: number;
  dcAcRatio: number;
  oversizingPercent: number;
  status: DcAcOversizingStatus;
  statusLabel: string;
  guidance: string;
};

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function calculateDcAcOversizing(
  dcPowerKwp: number,
  acPowerKw: number,
): DcAcOversizingResult {
  if (!Number.isFinite(dcPowerKwp) || dcPowerKwp <= 0) {
    throw new Error('A potência DC dos módulos deve ser maior que zero.');
  }

  if (!Number.isFinite(acPowerKw) || acPowerKw <= 0) {
    throw new Error('A potência AC do inversor deve ser maior que zero.');
  }

  const dcAcRatio = dcPowerKwp / acPowerKw;
  const oversizingPercent = Math.max((dcAcRatio - 1) * 100, 0);

  if (dcAcRatio < 1) {
    return {
      dcPowerKwp: round(dcPowerKwp, 3),
      acPowerKw: round(acPowerKw, 3),
      dcAcRatio: round(dcAcRatio, 3),
      oversizingPercent: 0,
      status: 'dc_below_ac',
      statusLabel: 'Sem oversizing',
      guidance: 'A potência DC dos módulos está abaixo da potência AC do inversor. Revise se o conjunto está adequado ao objetivo do projeto.',
    };
  }

  if (dcAcRatio <= 1.2) {
    return {
      dcPowerKwp: round(dcPowerKwp, 3),
      acPowerKw: round(acPowerKw, 3),
      dcAcRatio: round(dcAcRatio, 3),
      oversizingPercent: round(oversizingPercent, 1),
      status: 'reference',
      statusLabel: 'Até a referência de 1,20',
      guidance: 'A relação DC/AC está até 1,20. Ainda é necessário confirmar potência FV máxima, tensão, corrente e faixa MPPT no datasheet do inversor.',
    };
  }

  return {
    dcPowerKwp: round(dcPowerKwp, 3),
    acPowerKw: round(acPowerKw, 3),
    dcAcRatio: round(dcAcRatio, 3),
    oversizingPercent: round(oversizingPercent, 1),
    status: 'above_reference',
    statusLabel: 'Acima da referência de 1,20',
    guidance: 'A relação DC/AC está acima de 1,20. Revise cuidadosamente a potência FV máxima, tensão, corrente, faixa MPPT e as condições de garantia do inversor.',
  };
}
