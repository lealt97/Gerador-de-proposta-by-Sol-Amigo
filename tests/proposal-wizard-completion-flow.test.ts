import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  hasProposalCompletionData,
  isProposalPending,
} from '../src/lib/proposals/status';

const completedProposal = {
  status: 'pending',
  final_price: 28_500,
  monthly_consumption_kwh: 850,
  energy_tariff: 0.94,
  kit_cost: 15_000,
  solar: {
    installed_power_kwp: 7.7,
  },
};

test('rascunho continua obrigatoriamente no Wizard', () => {
  assert.equal(isProposalPending({ ...completedProposal, status: 'draft' }), true);
});

test('pending incompleto de auto-save continua no Wizard', () => {
  assert.equal(isProposalPending({
    status: 'pending',
    final_price: 0,
    monthly_consumption_kwh: 850,
    energy_tariff: 0.94,
    kit_cost: 15_000,
    solar: { installed_power_kwp: 7.7 },
  }), true);
});

test('pending concluído pode abrir detalhes, PDF e link público', () => {
  assert.equal(hasProposalCompletionData(completedProposal), true);
  assert.equal(isProposalPending(completedProposal), false);
});

test('cálculo solar retornado como relação em array também libera os detalhes', () => {
  assert.equal(isProposalPending({
    ...completedProposal,
    solar: [{ installed_power_kwp: 7.7 }],
  }), false);
});

test('status posteriores à conclusão nunca retornam ao Wizard', () => {
  for (const status of ['sent', 'viewed', 'approved', 'accepted', 'rejected', 'expired']) {
    assert.equal(isProposalPending({ status }), false);
  }
});

test('listagem carrega a potência calculada usada para distinguir conclusão de auto-save', async () => {
  const service = await readFile('src/services/proposalService.ts', 'utf8');
  const route = await readFile('src/components/proposals/ProposalDetailsRoute.tsx', 'utf8');

  assert.match(service, /solar:solar_system_calculations\(installed_power_kwp\)/);
  assert.match(route, /isProposalPending\(proposal\)/);
  assert.match(route, /navigate\(`\/propostas\/\$\{id\}\/editar`/);
});
