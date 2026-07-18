import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  PersistProposalBundleInput,
  ProposalRepository,
  createProposalOperations,
  extractChangedProposalUpdates,
  mergeProposalValues,
  proposalToFormValues,
} from '../src/lib/proposals/proposalOperations';
import { proposalSchema, ProposalFormValues } from '../src/lib/validations/proposal.schema';
import { Proposal } from '../src/types/proposal';

const baseForm: ProposalFormValues = {
  client_id: 'client-1',
  title: 'Sistema Fotovoltaico Residencial',
  consumption_source: 'average',
  monthly_consumption_kwh: 600,
  bill_amount: 720,
  history: [580, 610, 605],
  loads: [
    {
      equipment_name: 'Ar-condicionado',
      power_watts: 1200,
      quantity: 2,
      hours_per_day: 5,
      daily_consumption: 12,
    },
  ],
  system_type: 'on_grid',
  hsp: 5,
  panel_power_w: 600,
  yield_factor: 0.8,
  generation_target_percent: 100,
  oversizing: 1.2,
  energy_tariff: 1.2,
  kit_cost: 12000,
  labor_cost: 2500,
  fixed_costs: 800,
  freight_cost: 600,
  taxes: 300,
  commission: 500,
  other_costs: 0,
  additional_costs: [],
  margin_percentage: 20,
  discount_percentage: 0,
};

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal-1',
    user_id: 'user-1',
    client_id: 'client-1',
    code: 'PROP-0001',
    title: 'Sistema Fotovoltaico Residencial',
    status: 'draft',
    revision: 2,
    system_type: 'on_grid',
    consumption_source: 'average',
    history: [580, 610, 605],
    estimated_daily_consumption: null,
    monthly_consumption_kwh: 600,
    bill_amount: 720,
    energy_tariff: 1.2,
    battery_capacity_kwh: null,
    usable_battery_capacity_kwh: null,
    backup_power_kw: null,
    autonomy_hours: null,
    essential_loads_description: null,
    roof_type: null,
    roof_area_m2: null,
    roof_image_url: null,
    module_width_m: null,
    module_height_m: null,
    selected_solar_kit_id: null,
    solar_kit_snapshot: null,
    kit_cost: 12000,
    labor_cost: 2500,
    fixed_costs: 800,
    freight_cost: 600,
    taxes: 300,
    commission: 500,
    other_costs: 0,
    margin_percentage: 20,
    discount_percentage: 0,
    total_cost: 16700,
    gross_price: 20875,
    discount_value: 0,
    final_price: 20875,
    estimated_profit: 4175,
    real_margin_percentage: 20,
    markup_percentage: 25,
    pdf_url: null,
    public_token: null,
    sent_whatsapp_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: '2026-07-18T10:00:00.000Z',
    updated_at: '2026-07-18T10:00:00.000Z',
    solar: null,
    loads: [
      {
        id: 'load-1',
        proposal_id: 'proposal-1',
        equipment_name: 'Ar-condicionado',
        power_watts: 1200,
        quantity: 2,
        hours_per_day: 5,
        daily_consumption: 12,
        created_at: '2026-07-18T10:00:00.000Z',
      },
    ],
    ...overrides,
  } as Proposal;
}

function createRepository(overrides: Partial<ProposalRepository> = {}): ProposalRepository {
  return {
    getById: async (id) => makeProposal({ id }),
    persist: async (input) => makeProposal({
      id: input.proposalId || 'proposal-created',
      revision: (input.expectedRevision ?? 0) + 1,
      title: input.values.title || null,
    }),
    remove: async () => undefined,
    ...overrides,
  };
}

test('valida cliente obrigatório e equipamentos do levantamento de cargas', () => {
  assert.equal(proposalSchema.safeParse(baseForm).success, true);
  assert.equal(proposalSchema.safeParse({ ...baseForm, client_id: '' }).success, false);
  assert.equal(proposalSchema.safeParse({
    ...baseForm,
    loads: [{ equipment_name: '', power_watts: 100, quantity: 1, hours_per_day: 2 }],
  }).success, false);
});

test('cria proposta como nova revisão e registra o evento de criação', async () => {
  let received: PersistProposalBundleInput | null = null;
  const operations = createProposalOperations(createRepository({
    persist: async (input) => {
      received = input;
      return makeProposal({ id: 'proposal-created', title: input.values.title || null, revision: 1 });
    },
  }));

  const created = await operations.createProposal(baseForm, 'user-1');

  assert.equal(created.id, 'proposal-created');
  assert.equal(received?.proposalId, null);
  assert.equal(received?.expectedRevision, null);
  assert.equal(received?.eventType, 'created');
  assert.equal(received?.eventDescription, 'Proposta criada');
});

test('duplica a proposta com novo título e evento específico sem alterar a origem', async () => {
  const source = makeProposal({ id: 'source-1', title: 'Proposta Comercial' });
  let received: PersistProposalBundleInput | null = null;
  const operations = createProposalOperations(createRepository({
    getById: async () => source,
    persist: async (input) => {
      received = input;
      return makeProposal({ id: 'copy-1', title: input.values.title || null, revision: 1 });
    },
  }));

  const duplicated = await operations.duplicateProposal('source-1', 'user-1');

  assert.equal(duplicated.id, 'copy-1');
  assert.equal(received?.values.title, 'Proposta Comercial (Cópia)');
  assert.equal(received?.eventType, 'duplicated');
  assert.equal(received?.proposalId, null);
  assert.equal(source.title, 'Proposta Comercial');
});

test('edita somente os campos alterados e preserva coleções não enviadas', async () => {
  const current = makeProposal({ revision: 4 });
  let received: PersistProposalBundleInput | null = null;
  const operations = createProposalOperations(createRepository({
    getById: async () => current,
    persist: async (input) => {
      received = input;
      return makeProposal({
        title: input.values.title || null,
        monthly_consumption_kwh: Number(input.values.monthly_consumption_kwh),
        revision: 5,
      });
    },
  }));

  const updated = await operations.updateProposal('proposal-1', {
    title: 'Proposta Atualizada',
    monthly_consumption_kwh: 650,
  });

  assert.equal(updated.title, 'Proposta Atualizada');
  assert.equal(received?.proposalId, 'proposal-1');
  assert.equal(received?.expectedRevision, 4);
  assert.deepEqual(received?.values.history, [580, 610, 605]);
  assert.equal(received?.values.loads?.[0]?.equipment_name, 'Ar-condicionado');
});

test('não grava uma nova revisão quando os valores são equivalentes', async () => {
  let persistCalls = 0;
  const operations = createProposalOperations(createRepository({
    getById: async () => makeProposal({ monthly_consumption_kwh: 600 }),
    persist: async () => {
      persistCalls += 1;
      return makeProposal();
    },
  }));

  const result = await operations.updateProposal('proposal-1', {
    monthly_consumption_kwh: '600',
  });

  assert.equal(result.revision, 2);
  assert.equal(persistCalls, 0);
});

test('refaz a edição uma vez usando a revisão mais recente após conflito concorrente', async () => {
  const reads = [
    makeProposal({ revision: 3, title: 'Versão inicial', monthly_consumption_kwh: 600 }),
    makeProposal({ revision: 4, title: 'Alterada em outra sessão', monthly_consumption_kwh: 625 }),
  ];
  const persisted: PersistProposalBundleInput[] = [];
  let persistAttempt = 0;
  const operations = createProposalOperations(createRepository({
    getById: async () => reads.shift() || makeProposal({ revision: 4 }),
    persist: async (input) => {
      persisted.push(input);
      persistAttempt += 1;
      if (persistAttempt === 1) {
        throw { code: '40001', message: 'A proposta foi alterada em outra sessão' };
      }
      return makeProposal({
        revision: 5,
        title: input.values.title || null,
        monthly_consumption_kwh: Number(input.values.monthly_consumption_kwh),
      });
    },
  }));

  const updated = await operations.updateProposal('proposal-1', { title: 'Título do usuário' });

  assert.equal(updated.revision, 5);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].expectedRevision, 3);
  assert.equal(persisted[1].expectedRevision, 4);
  assert.equal(persisted[1].values.title, 'Título do usuário');
  assert.equal(persisted[1].values.monthly_consumption_kwh, 625);
});

test('propaga falha de edição que não seja conflito de revisão', async () => {
  const failure = new Error('Falha de banco');
  const operations = createProposalOperations(createRepository({
    persist: async () => Promise.reject(failure),
  }));

  await assert.rejects(
    () => operations.updateProposal('proposal-1', { title: 'Novo título' }),
    failure,
  );
});

test('exclui somente a proposta solicitada', async () => {
  const removed: string[] = [];
  const operations = createProposalOperations(createRepository({
    remove: async (id) => {
      removed.push(id);
    },
  }));

  await operations.deleteProposal('proposal-delete');
  assert.deepEqual(removed, ['proposal-delete']);
});

test('identifica mudanças reais e mantém estruturas complexas durante a mesclagem', () => {
  const current = proposalToFormValues(makeProposal());
  const changed = extractChangedProposalUpdates(current, {
    monthly_consumption_kwh: '600',
    discount_percentage: 5,
  });
  const merged = mergeProposalValues(current, changed);

  assert.equal('monthly_consumption_kwh' in changed, false);
  assert.equal(changed.discount_percentage, 5);
  assert.deepEqual(merged.history, current.history);
  assert.deepEqual(merged.loads, current.loads);
});
