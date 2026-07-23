import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMonthlyConsumptionSeries,
  calculateLoadDailyConsumptionKwh,
  calculateLoadMonthlyConsumptionKwh,
  resolveAverageMonthlyConsumptionKwh,
} from '../src/lib/calculations/consumptionModes';

const refrigerator = {
  equipmentName: 'Geladeira',
  powerWatts: 200,
  quantity: 1,
  hoursPerDay: 8,
  daysPerWeek: 7,
};

test('aceita consumo médio mensal informado diretamente', () => {
  const average = resolveAverageMonthlyConsumptionKwh({
    mode: 'average',
    directAverageMonthlyKwh: 650,
  });

  assert.equal(average, 650);
  assert.deepEqual(
    buildMonthlyConsumptionSeries({ mode: 'average', directAverageMonthlyKwh: 650 }),
    Array.from({ length: 12 }, () => 650),
  );
});

test('extrai a média dos doze meses', () => {
  const history = [500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700, 720];
  const average = resolveAverageMonthlyConsumptionKwh({
    mode: 'history',
    monthlyHistoryKwh: history,
  });

  assert.equal(average, 610);
});

test('levantamento de cargas considera potência, quantidade, horas e frequência semanal', () => {
  assert.equal(calculateLoadDailyConsumptionKwh(refrigerator), 1.6);
  assert.equal(calculateLoadMonthlyConsumptionKwh(refrigerator), 48);

  const average = resolveAverageMonthlyConsumptionKwh({
    mode: 'loads',
    loads: [
      refrigerator,
      {
        equipmentName: 'Iluminação',
        powerWatts: 20,
        quantity: 10,
        hoursPerDay: 5,
        daysPerWeek: 7,
      },
    ],
  });

  assert.equal(average, 78);
});

test('rejeita históricos incompletos e cargas inválidas', () => {
  assert.throws(
    () => resolveAverageMonthlyConsumptionKwh({ mode: 'history', monthlyHistoryKwh: [500] }),
    /12 meses/,
  );

  assert.throws(
    () => resolveAverageMonthlyConsumptionKwh({
      mode: 'loads',
      loads: [{ ...refrigerator, daysPerWeek: 8 }],
    }),
    /entre 1 e 7/,
  );
});
