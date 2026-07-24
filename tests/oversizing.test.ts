import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDcAcOversizing } from '../src/lib/calculations/oversizing';

test('calcula relação DC/AC e oversizing de 20%', () => {
  const result = calculateDcAcOversizing(6, 5);

  assert.equal(result.dcAcRatio, 1.2);
  assert.equal(result.oversizingPercent, 20);
  assert.equal(result.status, 'reference');
});

test('sinaliza relação acima da referência de 1,20', () => {
  const result = calculateDcAcOversizing(6.6, 5);

  assert.equal(result.dcAcRatio, 1.32);
  assert.equal(result.oversizingPercent, 32);
  assert.equal(result.status, 'above_reference');
});

test('não apresenta oversizing quando a potência DC é menor que a AC', () => {
  const result = calculateDcAcOversizing(4, 5);

  assert.equal(result.dcAcRatio, 0.8);
  assert.equal(result.oversizingPercent, 0);
  assert.equal(result.status, 'dc_below_ac');
});

test('rejeita potências inválidas', () => {
  assert.throws(() => calculateDcAcOversizing(0, 5), /potência DC/);
  assert.throws(() => calculateDcAcOversizing(5, 0), /potência AC/);
});
